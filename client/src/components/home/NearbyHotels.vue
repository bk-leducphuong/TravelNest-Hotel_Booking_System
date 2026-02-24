<template>
  <div class="hotel-container container" v-if="nearbyHotels.length > 0">
    <h2 class="h2">{{ $t('userHome.nearbyHotels') }}</h2>
    <Loading
      v-model:active="isLoading"
      :can-cancel="true"
      :color="`#003b95`"
      :is-full-page="false"
    />
    <div class="slider-container">
      <ElCarousel
        :interval="0"
        :arrow="groupedHotels.length > 1 ? 'hover' : 'never'"
        indicator-position="none"
        height="360px"
        class="hotel-carousel"
      >
        <ElCarouselItem v-for="(group, groupIndex) in groupedHotels" :key="groupIndex">
          <div class="hotel-group">
            <div
              class="hotel-card"
              v-for="(hotel, index) in group"
              :key="index"
              @click="redirectToHotelDetails(hotel)"
            >
              <div class="hotel-image">
                <img v-if="hotel.image_urls" :src="JSON.parse(hotel.image_urls)[0]" :alt="hotel.name" />
                <img v-else :src="'/assets/hotels/no-image.png'" :alt="hotel.name" />
                <SavedHotelIcon :hotelId="hotel.hotel_id" />
              </div>
              <div class="hotel-content">
                <h2 class="hotel-name">{{ hotel.name }}</h2>
                <p class="hotel-location">{{ hotel.address.slice(0, 35) }} ...</p>
                <div class="hotel-rating">
                  <span class="rating-badge">{{ hotel.overall_rating }}</span>
                  <span class="rating-text">{{ hotel.reviewSummary }}</span>
                  <span class="review-count">{{ hotel.reviewCount }}điểm đánh giá</span>
                </div>
              </div>
            </div>
          </div>
        </ElCarouselItem>
      </ElCarousel>
    </div>
  </div>
</template>

<script>
  import { mapActions, mapGetters } from 'vuex';
  import Loading from 'vue-loading-overlay';
  import 'vue-loading-overlay/dist/css/index.css';
  import SavedHotelIcon from '@/components/SavedHotelIcon.vue';
  import { HomeService } from '@/services/home.service';
  import errorHandler from '@/request/errorHandler';

  export default {
    name: 'NearbyHotels',
    components: {
      Loading,
      SavedHotelIcon,
    },
    props: {
      userLocation: {
        type: String,
        default: null,
      },
    },
    computed: {
      ...mapGetters('auth', ['isUserAuthenticated']),
      itemsPerSlide() {
        if (this.windowWidth >= 1400) return 5;
        if (this.windowWidth >= 1200) return 4;
        if (this.windowWidth >= 768) return 3;
        return 2;
      },
      groupedHotels() {
        const groups = [];
        for (let i = 0; i < this.nearbyHotels.length; i += this.itemsPerSlide) {
          groups.push(this.nearbyHotels.slice(i, i + this.itemsPerSlide));
        }
        return groups;
      },
    },
    data() {
      return {
        nearbyHotels: [],
        isLoading: false,
        windowWidth: typeof window !== 'undefined' ? window.innerWidth : 1200,
      };
    },
    watch: {
      userLocation: {
        handler(newLocation) {
          if (newLocation) {
            this.loadNearbyHotels();
          }
        },
        immediate: true,
      },
    },
    mounted() {
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', this.handleResize);
        this.handleResize();
      }
    },
    beforeUnmount() {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', this.handleResize);
      }
    },
    methods: {
      handleResize() {
        this.windowWidth = window.innerWidth;
      },
      ...mapActions('search', ['updateLocation']),
      async loadNearbyHotels() {
        try {
          this.isLoading = true;
          const response = await HomeService.getNearbyHotels(this.userLocation);
          this.nearbyHotels = response.data || [];
        } catch (error) {
          errorHandler(error);
        } finally {
          this.isLoading = false;
        }
      },
      async redirectToHotelDetails(hotel) {
        try {
          this.updateLocation(hotel.city);
          const hotel_id = hotel.hotel_id;

          // Save viewed hotel to localStorage
          const viewedHotels = localStorage.getItem('viewedHotels')
            ? JSON.parse(localStorage.getItem('viewedHotels'))
            : [];

          const index = viewedHotels.findIndex((hotelId) => hotelId === hotel_id);

          if (index !== -1) {
            viewedHotels.splice(index, 1);
          }
          viewedHotels.push(hotel_id);
          localStorage.setItem('viewedHotels', JSON.stringify(viewedHotels));

          // Record hotel view if authenticated
          if (this.isUserAuthenticated) {
            try {
              await HomeService.recordHotelView(hotel_id);
            } catch (error) {
              errorHandler(error);
            }
          }

          this.$router.push({ name: 'HotelDetails', params: { hotel_id: hotel_id } });
        } catch (error) {
          console.error('Error redirecting to hotel details:', error);
        }
      },
    },
  };
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/index.scss';

  .hotel-container {
    margin-bottom: 30px;
    margin-top: 30px;
    position: relative;
  }

  .h2 {
    font-weight: bolder;
    display: block;
    font-size: 28px;
  }

  .slider-container {
    position: relative;
  }

  .hotel-carousel {
    :deep(.el-carousel__container) {
      height: 360px;
    }

    :deep(.el-carousel__item) {
      padding: 0 $spacing-sm;
    }
  }

  .hotel-group {
    display: flex;
    gap: $spacing-lg;
    justify-content: center;
    height: 100%;
    align-items: flex-start;
  }

  .hotel-card {
    height: 360px;
    flex: 0 0 280px;
    background: $white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    position: relative;
    transition: transform 0.3s;
    cursor: pointer;

    &:hover {
      transform: translateY(-5px);
    }

    @media (max-width: 1400px) {
      flex: 0 0 calc((100% - 60px) / 4);
      max-width: 280px;
    }

    @media (max-width: 1200px) {
      flex: 0 0 calc((100% - 40px) / 3);
      max-width: 280px;
    }

    @media (max-width: 768px) {
      flex: 0 0 calc((100% - 20px) / 2);
      max-width: 280px;
    }
  }

  .hotel-image {
    position: relative;
    height: 60%;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 0;
    }
  }

  .hotel-content {
    height: 40%;
    padding: 15px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .hotel-name {
    font-size: $font-size-base;
    font-weight: 600;
    margin: 0 0 5px 0;
    color: $text-primary;
  }

  .hotel-location {
    font-size: $font-size-sm;
    color: $text-secondary;
    margin: 0 0 10px 0;
  }

  .hotel-rating {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  .rating-badge {
    background: $primary-color;
    color: $white;
    padding: 4px 8px;
    border-radius: $border-radius-sm;
    font-weight: bold;
  }

  .rating-text {
    font-size: $font-size-sm;
    color: $text-primary;
  }

  .review-count {
    color: $text-secondary;
    font-size: $font-size-sm;
  }
</style>
