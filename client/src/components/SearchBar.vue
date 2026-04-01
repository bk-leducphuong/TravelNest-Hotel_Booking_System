<template>
  <div>
    <div v-if="isSearchOpen" class="slide">
      <div class="container">
        <div v-if="$route.name === 'Home'" class="inner-wrap">
          <strong>{{ $t('userHeader.titleHeader') }}</strong>
          <br />
          <p>{{ $t('userHeader.subtitleHeader') }}</p>
        </div>
      </div>
    </div>

    <!-- Search bar -->
    <div v-if="isSearchOpen" class="search">
      <div class="container">
        <div class="search-bar">
          <!-- Location input with autocomplete -->
          <div class="location-autocomplete">
            <ElAutocomplete
              v-model="selectedLocation"
              :fetch-suggestions="querySearch"
              :placeholder="$t('userHeader.locationInputPlaceholder')"
              :prefix-icon="LocationIcon"
              clearable
              class="search-input"
              @select="handleSelect"
            >
              <template #default="{ item }">
                <div class="location-item-suggestion">
                  <div class="location-name">{{ item.name }}</div>
                  <div class="location-country">{{ item.country }}</div>
                </div>
              </template>
            </ElAutocomplete>
          </div>

          <!-- Date picker input -->
          <div class="date-picker">
            <ElDatePicker
              v-model="dateRange"
              type="daterange"
              range-separator="đến"
              start-placeholder="Nhận phòng"
              end-placeholder="Trả phòng"
              :prefix-icon="CalendarIcon"
              :disabled-date="disabledDate"
              format="DD/MM/YYYY"
              value-format="YYYY-MM-DD"
              class="search-input"
              @change="handleDateChange"
            />
          </div>

          <!-- Guest room input -->
          <div v-click-outside="hideGuestSelector" class="guest-room-wrapper">
            <input
              v-model="guestDetails"
              type="text"
              class="search-input"
              readonly
              @click="toggleGuestSelector"
            />

            <!-- Guest room selector -->
            <div v-if="showGuestSelector" id="guest-room-selector" class="guest-room-selector">
              <div class="selector-item">
                <span>{{ $t('userHeader.guestInputPlaceholder_1') }}</span>
                <ElInputNumber
                  v-model="adults"
                  :min="1"
                  :max="30"
                  controls-position="right"
                  size="small"
                />
              </div>
              <div class="selector-item">
                <span
                  >{{ $t('userHeader.guestInputPlaceholder_2') }} <small>(0 - 17 tuổi)</small></span
                >
                <ElInputNumber
                  v-model="children"
                  :min="0"
                  :max="10"
                  controls-position="right"
                  size="small"
                />
              </div>
              <div class="selector-item">
                <span>{{ $t('userHeader.guestInputPlaceholder_3') }}</span>
                <ElInputNumber
                  v-model="rooms"
                  :min="1"
                  :max="30"
                  controls-position="right"
                  size="small"
                />
              </div>
            </div>
          </div>

          <!-- Search button -->
          <button class="search-button" @click="submitSearch">
            {{ $t('userHeader.searchButton') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import { mapGetters } from 'vuex';
  import { useToast } from 'vue-toastification';
  import { Location, Calendar } from '@element-plus/icons-vue';
  import { shallowRef } from 'vue';
  import { SearchService } from '@/services/search.service';

  export default {
    setup() {
      const toast = useToast();
      const LocationIcon = shallowRef(Location);
      const CalendarIcon = shallowRef(Calendar);
      
      return {
        toast,
        LocationIcon,
        CalendarIcon,
      };
    },
    props: {
      isSearchOpen: {
        type: Boolean,
        required: true,
      },
    },
    data() {
      return {
        showGuestSelector: false,
        selectedLocation: null,
        dateRange: null,
        adults: 2,
        children: 0,
        rooms: 1,
        checkInDate: null,
        checkOutDate: null,
        numberOfDays: null,
      };
    },
    computed: {
      ...mapGetters('search', ['getSearchData']),
      guestDetails() {
        return (
          `${this.adults} ` +
          this.$t('userHeader.guestInputPlaceholder_1') +
          ` · ${this.children} ` +
          this.$t('userHeader.guestInputPlaceholder_2') +
          ` · ${this.rooms} ` +
          this.$t('userHeader.guestInputPlaceholder_3')
        );
      },
    },
    async mounted() {
      if (this.getSearchData) {
        this.selectedLocation = this.getSearchData.location;
        if (this.getSearchData.checkInDate && this.getSearchData.checkOutDate) {
          // Ensure dates are not in the past
          let checkInDate = this.getSearchData.checkInDate;
          let checkOutDate = this.getSearchData.checkOutDate;

          if (new Date(checkInDate).getTime() < new Date().getTime()) {
            checkInDate = new Date().toISOString().split('T')[0];
          }
          if (new Date(checkOutDate).getTime() < new Date().getTime()) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            checkOutDate = tomorrow.toISOString().split('T')[0];
          }

          this.dateRange = [checkInDate, checkOutDate];
          this.checkInDate = checkInDate;
          this.checkOutDate = checkOutDate;
        }
        this.children = this.getSearchData.children;
        this.adults = this.getSearchData.adults;
        this.rooms = this.getSearchData.rooms;
        this.numberOfDays = this.getSearchData.numberOfDays;
      }
    },
    methods: {
      async querySearch(queryString, cb) {
        if (!queryString || !queryString.trim()) {
          cb([]);
          return;
        }
        try {
          const response = await SearchService.getDestinationAutocomplete(
            queryString.trim(),
            10
          );
          const suggestions = response?.data?.suggestions ?? response?.suggestions ?? [];
          const results = suggestions.map((s) => ({
            name: s.text ?? s.payload?.display_name ?? '',
            country: s.payload?.country_name ?? '',
            value: s.text ?? s.payload?.display_name ?? '',
          }));
          cb(results);
        } catch (error) {
          console.error('Destination autocomplete error:', error);
          cb([]);
        }
      },
      handleSelect(item) {
        this.selectedLocation = item.name || item.value;
      },
      disabledDate(time) {
        // Disable dates before today
        return time.getTime() < Date.now() - 8.64e7;
      },
      handleDateChange(value) {
        if (value && value.length === 2) {
          this.checkInDate = value[0];
          this.checkOutDate = value[1];
          this.calculateNumberOfDays(this.checkInDate, this.checkOutDate);
        } else {
          this.checkInDate = null;
          this.checkOutDate = null;
          this.numberOfDays = null;
        }
      },
      calculateNumberOfDays(checkInDateString, checkOutDateString) {
        const checkInDate = new Date(checkInDateString);
        const checkOutDate = new Date(checkOutDateString);
        const timeDifference = checkOutDate - checkInDate;
        this.numberOfDays = timeDifference / (1000 * 60 * 60 * 24) + 1;
      },
      toggleGuestSelector() {
        this.showGuestSelector = !this.showGuestSelector;
      },
      hideGuestSelector() {
        this.showGuestSelector = false;
      },
      async submitSearch() {
        if (!this.selectedLocation || !this.checkInDate || !this.checkOutDate) {
          this.toast.error('Vui lòng chọn địa điểm và ngày bắt đầu và kết thúc');
          return;
        }

        // Redirect user to search results page with query params
        this.$router.push({
          name: 'SearchResults',
          query: {
            location: this.selectedLocation,
            checkInDate: this.checkInDate,
            checkOutDate: this.checkOutDate,
            numberOfDays: this.numberOfDays,
            adults: this.adults,
            children: this.children,
            rooms: this.rooms,
          },
        });
      },
    },
  };
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/index.scss';

  // Slide section
  .slide {
    position: relative;
    background-color: $primary-color;
    padding-bottom: 30px;

    .img {
      width: 100%;
      height: 350px;
      background-repeat: no-repeat;
      background-position: center center;
      background-size: cover;
      @include flex-center;
      position: relative;
      color: $white;
      z-index: 1;
    }

    .inner-wrap {
      position: relative;
      top: -30px;
      color: $white;

      strong {
        font-size: 50px;
      }

      p {
        margin-left: 8px;
        font-size: $font-size-lg;
      }
    }
  }

  // Search section
  .search-bar {
    background-color: #ffb700;
    width: 1100px;
    height: 60px;
    @include flex-between;
    padding: 0 4px;
    box-sizing: border-box;
    border-radius: $border-radius-sm;
    position: relative;
    left: 50%;
    top: -30px;
    transform: translateX(-50%);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 9;
    gap: 4px;
  }

  // Location autocomplete
  .location-autocomplete {
    width: 30%;
    
    :deep(.el-autocomplete) {
      width: 100%;
    }

    :deep(.el-input__wrapper) {
      height: 50px;
      border-radius: $border-radius-sm;
      box-shadow: none;
    }

    :deep(.el-input__inner) {
      font-size: $font-size-base;
    }
  }

  .location-item-suggestion {
    display: flex;
    flex-direction: column;
    padding: 4px 0;

    .location-name {
      font-weight: 600;
      color: $text-primary;
    }

    .location-country {
      font-size: $font-size-sm;
      color: $text-secondary;
    }
  }

  // Date picker
  .date-picker {
    width: 30%;

    :deep(.el-date-editor) {
      width: 100%;
      height: 50px;
      border-radius: $border-radius-sm;
      box-shadow: none;
    }

    :deep(.el-input__wrapper) {
      border-radius: $border-radius-sm;
      box-shadow: none;
    }

    :deep(.el-input__inner) {
      font-size: $font-size-base;
    }

    :deep(.el-range-separator) {
      font-size: $font-size-sm;
    }
  }

  // Guest room wrapper
  .guest-room-wrapper {
    position: relative;
    display: inline-block;
    width: 30%;

    input {
      width: 100%;
      height: 50px;
      padding: 0 $spacing-sm 0 $spacing-xxl;
      border: none;
      border-radius: $border-radius-sm;
      font-size: $font-size-base;
      background-repeat: no-repeat;
      background-position: $spacing-sm center;
      background-size: 16px;
      background-color: $white;
      cursor: pointer;
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>');
    }

    .selector-item {
      @include flex-between;
      margin-bottom: $spacing-md;
      padding: 0 $spacing-sm;

      &:last-child {
        margin-bottom: 0;
      }

      span {
        font-size: $font-size-base;
        color: $text-primary;
      }
    }
  }

  #guest-room-selector {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    background-color: $white;
    border: 1px solid $border-color;
    border-radius: 8px;
    padding: $spacing-md;
    z-index: 100;
    width: 100%;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

    :deep(.el-input-number) {
      width: 120px;
    }

    :deep(.el-input-number__increase),
    :deep(.el-input-number__decrease) {
      background-color: transparent;
    }
  }

  .search-button {
    background-color: $secondary-color;
    color: $white;
    border: none;
    padding: 8px $spacing-lg;
    cursor: pointer;
    font-weight: bold;
    border-radius: $border-radius-sm;
    font-size: 18px;
    width: 8%;
    height: 50px;
    transition: all 0.3s ease;

    &:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }
  }
</style>
