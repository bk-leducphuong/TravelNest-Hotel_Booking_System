<template>
  <section
    v-if="isSearchOpen"
    class="guest-search-area"
    :class="{ 'guest-search-home': $route.name === 'Home' }"
    :aria-label="$t('guest.staySearch')"
  >
    <div class="guest-search-container">
      <div v-if="$route.name === 'Home'" class="guest-hero">
        <p class="guest-eyebrow">{{ $t('guest.heroEyebrow') }}</p>
        <h1>{{ $t('userHeader.titleHeader') }}</h1>
        <p>{{ $t('userHeader.subtitleHeader') }}</p>
      </div>
      <form class="search-bar" @submit.prevent="submitSearch">
        <div v-valid-active-descendant class="location-autocomplete">
          <label for="guest-destination">{{ $t('guest.destination') }}</label
          ><ElAutocomplete
            id="guest-destination"
            v-model="selectedLocation"
            :fetch-suggestions="querySearch"
            :placeholder="$t('userHeader.locationInputPlaceholder')"
            :aria-label="$t('guest.destination')"
            :prefix-icon="LocationIcon"
            clearable
            @select="handleSelect"
          >
            <template #default="{ item }"
              ><div class="location-item-suggestion">
                <span>{{ item.name }}</span
                ><small>{{ item.country }}</small>
              </div></template
            >
          </ElAutocomplete>
        </div>
        <div class="date-picker">
          <span class="search-field-label">{{ $t('guest.dates') }}</span
          ><ElDatePicker
            v-model="dateRange"
            type="daterange"
            :range-separator="$t('userHeader.dateRangeSeparator')"
            :start-placeholder="$t('userHeader.checkInPlaceholder')"
            :end-placeholder="$t('userHeader.checkOutPlaceholder')"
            :aria-label="$t('guest.dates')"
            :prefix-icon="CalendarIcon"
            :disabled-date="disabledDate"
            format="DD/MM/YYYY"
            value-format="YYYY-MM-DD"
          />
        </div>
        <div class="guest-room-wrapper">
          <span class="search-field-label">{{ $t('guest.guestsRooms') }}</span
          ><button
            ref="guestTrigger"
            type="button"
            class="guest-picker-trigger"
            :aria-label="$t('userHeader.guestInputLabel')"
            aria-haspopup="dialog"
            :aria-expanded="showGuestSelector"
            @click="toggleGuestSelector"
          >
            {{ guestDetails }}
          </button>
        </div>
        <button class="search-button guest-button" type="submit">
          {{ $t('userHeader.searchButton') }}
        </button>
      </form>
      <FeedbackMessage v-if="feedback" v-bind="feedback" @dismiss="clearFeedback" />
    </div>
    <ElDialog
      v-model="showGuestSelector"
      :title="$t('guest.guestsRooms')"
      width="420px"
      append-to-body
      @closed="$refs.guestTrigger?.focus()"
    >
      <div class="selector-item">
        <span>{{ $t('userHeader.guestInputPlaceholder_1') }}</span
        ><ElInputNumber
          v-model="adults"
          :min="1"
          :max="30"
          :aria-label="$t('userHeader.guestInputPlaceholder_1')"
        />
      </div>
      <div class="selector-item">
        <span>{{ $t('userHeader.guestInputPlaceholder_2') }}</span
        ><ElInputNumber
          v-model="children"
          :min="0"
          :max="10"
          :aria-label="$t('userHeader.guestInputPlaceholder_2')"
        />
      </div>
      <div class="selector-item">
        <span>{{ $t('userHeader.guestInputPlaceholder_3') }}</span
        ><ElInputNumber
          v-model="rooms"
          :min="1"
          :max="30"
          :aria-label="$t('userHeader.guestInputPlaceholder_3')"
        />
      </div>
      <template #footer
        ><button type="button" class="guest-button" @click="hideGuestSelector">
          {{ $t('guest.done') }}
        </button></template
      >
    </ElDialog>
  </section>
</template>

<script>
  import { mapGetters, mapActions } from 'vuex';
  import sectionFeedback from '@/mixins/sectionFeedback';
  import { Location, Calendar } from '@element-plus/icons-vue';
  import { shallowRef } from 'vue';
  import { SearchService } from '@/services/search.service';
  import { stayNights } from '@/utils/stay';

  export default {
    mixins: [sectionFeedback],
    directives: {
      validActiveDescendant: {
        mounted(el) {
          // Element Plus writes an item -1 reference before any option exists.
          // Observe just this input wrapper and preserve real keyboard references.
          const clean = () => {
            const input = el.querySelector('input');
            const id = input?.getAttribute('aria-activedescendant');
            if (id && !document.getElementById(id)) input.removeAttribute('aria-activedescendant');
          };
          const observer = new MutationObserver(clean);
          observer.observe(el, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['aria-activedescendant'],
          });
          el.activeDescendantObserver = observer;
          clean();
        },
        unmounted(el) {
          el.activeDescendantObserver?.disconnect();
        },
      },
    },
    setup() {
      const LocationIcon = shallowRef(Location);
      const CalendarIcon = shallowRef(Calendar);

      return {
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
        selectedDestinationId: null,
        selectedDestinationName: null,
      };
    },
    computed: {
      ...mapGetters('search', ['getSearchData']),
      // The Vuex `search` store is the single source of truth for the search
      // criteria. Binding both this bar and the hotel-detail bar to it keeps
      // them in sync in both directions.
      selectedLocation: {
        get() {
          return this.getSearchData.location || '';
        },
        set(value) {
          this.updateLocation(value || '');
        },
      },
      adults: {
        get() {
          return this.getSearchData.adults;
        },
        set(value) {
          this.updateAdults(value);
        },
      },
      children: {
        get() {
          return this.getSearchData.children;
        },
        set(value) {
          this.updateChildren(value);
        },
      },
      rooms: {
        get() {
          return this.getSearchData.rooms;
        },
        set(value) {
          this.updateRooms(value);
        },
      },
      checkInDate() {
        return this.getSearchData.checkInDate;
      },
      checkOutDate() {
        return this.getSearchData.checkOutDate;
      },
      numberOfDays() {
        return this.getSearchData.numberOfDays;
      },
      dateRange: {
        get() {
          const { checkInDate, checkOutDate } = this.getSearchData;
          return checkInDate && checkOutDate ? [checkInDate, checkOutDate] : null;
        },
        set(value) {
          if (Array.isArray(value) && value[0] && value[1]) {
            this.updateCheckInDate(value[0]);
            this.updateCheckOutDate(value[1]);
            this.updateNumberOfDays(this.daysBetween(value[0], value[1]));
          } else {
            this.updateCheckInDate(null);
            this.updateCheckOutDate(null);
            this.updateNumberOfDays(null);
          }
        },
      },
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
    methods: {
      ...mapActions('search', [
        'updateLocation',
        'updateCheckInDate',
        'updateCheckOutDate',
        'updateNumberOfDays',
        'updateAdults',
        'updateChildren',
        'updateRooms',
      ]),
      async querySearch(queryString, cb) {
        if (!queryString || !queryString.trim()) {
          cb([]);
          return;
        }
        try {
          this.clearFeedback();
          const response = await SearchService.getDestinationAutocomplete(queryString.trim(), 10);
          const suggestions = response?.data?.suggestions ?? response?.suggestions ?? [];
          const results = suggestions.map((s) => ({
            id: s.payload?.id ?? null,
            type: s.payload?.type ?? null,
            name: s.text ?? s.payload?.display_name ?? '',
            country: s.payload?.country_name ?? '',
            value: s.text ?? s.payload?.display_name ?? '',
          }));
          cb(results);
        } catch (error) {
          this.showError(this.$t('feedback.autocomplete'));
          cb([]);
        }
      },
      handleSelect(item) {
        this.selectedLocation = item.name || item.value;
        this.selectedDestinationId = item.id || null;
        this.selectedDestinationName = item.name || item.value || null;
      },
      disabledDate(time) {
        // Disable dates before today
        return time.getTime() < Date.now() - 8.64e7;
      },
      daysBetween(checkInDateString, checkOutDateString) {
        return stayNights(checkInDateString, checkOutDateString);
      },
      toggleGuestSelector() {
        this.showGuestSelector = !this.showGuestSelector;
      },
      hideGuestSelector() {
        this.showGuestSelector = false;
      },
      async submitSearch() {
        this.clearFeedback();
        if (
          !this.selectedLocation ||
          !this.checkInDate ||
          !this.checkOutDate ||
          !stayNights(this.checkInDate, this.checkOutDate)
        ) {
          this.showError(this.$t('searchResults.invalidSearch'));
          this.feedback.title = this.$t('searchResults.errorTitle');
          return;
        }

        // Redirect user to search results page with query params
        const query = {
          location: this.selectedLocation,
          checkInDate: this.checkInDate,
          checkOutDate: this.checkOutDate,
          numberOfDays: stayNights(this.checkInDate, this.checkOutDate),
          adults: this.adults,
          children: this.children,
          rooms: this.rooms,
        };

        // Only pin the destination when the value still matches the picked
        // suggestion; free-typed text falls back to server-side resolution.
        if (this.selectedDestinationId && this.selectedLocation === this.selectedDestinationName) {
          query.destinationId = this.selectedDestinationId;
        }

        this.$router.push({
          name: 'SearchResults',
          query,
        });
      },
    },
    mounted() {
      if (this.checkInDate && this.checkOutDate)
        this.updateNumberOfDays(stayNights(this.checkInDate, this.checkOutDate));
    },
  };
</script>

<style scoped>
  .guest-search-container {
    max-width: 1200px;
    margin: auto;
    padding: 24px;
  }
  .guest-search-home {
    background: var(--tn-soft);
  }
  .guest-hero {
    padding: 24px 0 28px;
    max-width: 760px;
  }
  .guest-hero h1 {
    color: var(--tn-brand);
    font-size: clamp(30px, 4vw, 46px);
    font-weight: 500;
    letter-spacing: -0.045em;
    line-height: 1.2;
    margin: 8px 0 16px;
  }
  .guest-hero p {
    color: var(--tn-muted);
    font-size: 16px;
    margin: 0;
  }
  .guest-hero .guest-eyebrow {
    font-size: 12px;
    font-weight: 500;
    color: var(--tn-brand);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .search-bar {
    background: white;
    border: 1px solid #ededed;
    border-radius: 20px;
    padding: 20px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr) minmax(0, 1fr) auto;
    gap: 16px;
    align-items: end;
    box-shadow: 0 8px 30px #003b9507;
  }
  .search-bar > div {
    min-width: 0;
  }
  .search-bar label,
  .search-field-label {
    display: block;
    font-size: 12px;
    color: var(--tn-muted);
    margin: 0 0 6px;
  }
  .search-bar :deep(.el-autocomplete),
  .search-bar :deep(.el-date-editor) {
    width: 100%;
    min-width: 0;
  }
  .search-bar :deep(.el-input__wrapper),
  .search-bar :deep(.el-range-editor) {
    min-height: 44px;
    background: #f8f8f8;
    border-radius: 10px;
  }
  .search-bar :deep(.el-range-input) {
    min-width: 0;
    width: 42%;
    font-size: 12px;
    background: transparent;
  }
  .guest-picker-trigger {
    width: 100%;
    min-height: 44px;
    background: #f8f8f8;
    border: 1px solid #ccc;
    border-radius: 10px;
    color: var(--tn-ink);
    font-size: 12px;
    padding: 8px;
    cursor: pointer;
    text-align: left;
  }
  .location-item-suggestion {
    display: flex;
    flex-direction: column;
    line-height: 1.6;
    padding: 5px 0;
  }
  .location-item-suggestion small {
    color: var(--tn-muted);
  }
  .selector-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 0 0 20px;
  }
  @media (max-width: 1023px) {
    .search-bar {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
    .search-button {
      width: 100%;
    }
  }
  @media (max-width: 600px) {
    .guest-search-container {
      padding: 16px;
    }
    .guest-hero {
      padding: 20px 0 24px;
    }
    .search-bar {
      grid-template-columns: minmax(0, 1fr);
      padding: 20px;
      gap: 14px;
    }
  }
</style>
