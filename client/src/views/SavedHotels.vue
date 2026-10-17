<script>
import TheHeader from '@/components/Header.vue'
import TheFooter from '@/components/Footer.vue'
import SkeletonGrid from '@/components/common/SkeletonGrid.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { mapGetters } from 'vuex'
import { useToast } from 'vue-toastification'
import errorHandler from '@/request/errorHandler';
import { UserService } from '@/services/user.service'
import { getFirstImageUrl } from '@/utils/images'
export default {
  components: {
    TheHeader,
    TheFooter,
    SkeletonGrid,
    EmptyState
  },
  setup() {
    const toast = useToast()
    return { toast }
  },
  data() {
    return {
      hotels: [],
      isLoading: false,
      sliderPosition: 0,
      // Tracked in reactive state (not read from $refs during render) so the
      // nav buttons reflect the real scroll position after the DOM updates.
      sliderScrollWidth: 0,
      sliderClientWidth: 0
    }
  },
  computed: {
    ...mapGetters('user', ['getUserInformation']),
    // Furthest position the slider can be scrolled to.
    maxScroll() {
      return Math.max(this.sliderScrollWidth - this.sliderClientWidth, 0)
    },
    // Check if left scroll should be disabled
    disableScrollLeft() {
      return this.sliderPosition <= 0
    },
    // Check if right scroll should be disabled
    disableScrollRight() {
      return this.sliderPosition >= this.maxScroll
    }
  },
  methods: {
    async getSavedHotels() {
      try {
        this.isLoading = true
        const response = await UserService.getFavoriteHotels()
        this.hotels = response?.data ?? []
      } catch (error) {
        errorHandler(error)
        this.hotels = []
      } finally {
        this.isLoading = false
      }
    },
    // Scroll functionality for sliders
    scrollLeft() {
      const slider = this.$refs.slider
      if (!slider) return
      // Ensure the scroll position doesn't go below 0
      this.sliderPosition = Math.max(this.sliderPosition - 300, 0)

      slider.scrollTo({ left: this.sliderPosition, behavior: 'smooth' })
    },

    scrollRight() {
      const slider = this.$refs.slider
      if (!slider) return
      // Ensure the scroll position doesn't exceed the rightmost position
      this.sliderPosition = Math.min(this.sliderPosition + 300, this.maxScroll)

      slider.scrollTo({ left: this.sliderPosition, behavior: 'smooth' })
    },
    // Open the hotel's detail page for a saved card.
    openHotel(hotelId) {
      this.$router.push({ name: 'HotelDetails', params: { hotel_id: hotelId } })
    },
    async deleteSavedHotel(hotel) {
      try {
        await UserService.removeFavoriteHotel(hotel.hotel_id)
        this.hotels = this.hotels.filter((saved) => saved.hotel_id !== hotel.hotel_id)
        const name = hotel.hotelInformation?.name
        this.toast.success(
          name
            ? this.$t('savedHotel.page.removedWithName', { name })
            : this.$t('savedHotel.page.removed')
        )
      } catch (error) {
        errorHandler(error)
      }
    },
    handleScroll(event) {
      const slider = event.target
      this.sliderPosition = slider.scrollLeft
      // Keep metrics fresh in case the slider is resized (e.g. viewport change).
      this.sliderScrollWidth = slider.scrollWidth
      this.sliderClientWidth = slider.clientWidth
    },
    // Measure the slider once it is in the DOM so the nav buttons reflect the
    // actual overflow (cards keep a fixed width and overflow the row).
    updateSliderMetrics() {
      const slider = this.$refs.slider
      if (!slider) return
      this.sliderScrollWidth = slider.scrollWidth
      this.sliderClientWidth = slider.clientWidth
    },
    // Render `hotel_class` (1-5) as filled stars.
    starString(hotelClass) {
      const count = Math.max(0, Math.min(5, parseInt(hotelClass, 10) || 0));
      return '★'.repeat(count) || '—';
    },
    getFirstImageUrl
  },
  async mounted() {
    await this.getSavedHotels()
    // Wait for the cards to render, then measure the slider for nav buttons.
    await this.$nextTick()
    this.updateSliderMetrics()
    window.addEventListener('resize', this.updateSliderMetrics)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateSliderMetrics)
  }
}
</script>
<template>
  <TheHeader :isSearchOpen="false" />
  <div class="header-container">
    <div class="header-title">
      {{ $t('savedHotel.page.title') }}
      <span class="info-label">{{ $t('savedHotel.page.savedCount', { count: hotels.length }) }}</span>
    </div>
  </div>
  <div class="slider-container">
    <SkeletonGrid v-if="isLoading" :count="4" image-height="200px" />
    <EmptyState
      v-else-if="hotels.length === 0"
      :title="$t('savedHotel.page.emptyTitle')"
      :message="$t('savedHotel.page.emptyMessage')"
      icon="fa-regular fa-heart"
    />
    <template v-else>
      <div class="slider-wrapper" ref="slider" @scroll="handleScroll">
      <div
        class="hotel-card"
        v-for="hotel in hotels"
        :key="hotel.hotel_id"
        @click="openHotel(hotel.hotel_id)"
      >
        <div>
          <img
            :src="getFirstImageUrl(hotel.hotelInformation.image_urls)"
            :alt="hotel.hotelInformation.name"
            class="hotel-image"
          />
          <button
            class="close-button"
            type="button"
            :aria-label="$t('savedHotel.page.removeAria', { name: hotel.hotelInformation.name })"
            @click.stop="deleteSavedHotel(hotel)"
          >
            <i class="fa fa-times" aria-hidden="true"></i>
          </button>
        </div>
        <div
          class="hotel-info"
          style="display: flex; flex-direction: column; justify-content: space-between"
        >
          <div>
            <h3 class="hotel-name">{{ hotel.hotelInformation.name }}</h3>
            <div
              class="star-rating"
              :aria-label="$t('savedHotel.page.starsAria', { count: hotel.hotelInformation.hotel_class || 0 })"
            >
              {{ starString(hotel.hotelInformation.hotel_class) }}
            </div>
            <div v-if="hotel.hotelInformation.overall_rating">
              <span class="rating">{{ hotel.hotelInformation.overall_rating }}</span>
            </div>
            <div class="location">
              <span><i class="fa fa-map-marker" aria-hidden="true"></i> {{ hotel.hotelInformation.address }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="nav-button-container">
      <button class="nav-button prev" :disabled="disableScrollLeft" @click="scrollLeft()">
        ‹
      </button>
      <button class="nav-button next" :disabled="disableScrollRight" @click="scrollRight()">
        ›
      </button>
    </div>
    </template>
  </div>
  <TheFooter />
</template>
<style scoped>
/* header */
.header-container {
  /* max-width: 1200px; */
  margin: 0 auto;
  padding: 20px 40px;
  border-bottom: 1px solid #ddd;
  background-color: #f9f9f9;
}

.header-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 10px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* padding: 15px 20px; */
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dropdown {
  padding: 5px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.btn {
  padding: 8px 12px;
  font-size: 14px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.primary-btn {
  background-color: #007bff;
  color: white;
}

.secondary-btn {
  background-color: white;
  color: #007bff;
  border: 1px solid #007bff;
}

.map-btn {
  background-color: #007bff;
  color: white;
  padding: 8px 16px;
}
/* end header */

.info-group {
  display: flex;
  align-items: center;
}

.info-label {
  font-size: 14px;
  color: #333;
}

.date-picker,
.guest-picker {
  padding: 8px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  text-align: center;
}

.slider-container {
  margin: 20px 40px;
  position: relative;
  padding: 20px 0;
}

.slider-wrapper {
  display: flex;
  /* justify-content: space-between; */
  gap: 20px;
  overflow-x: auto;
  scroll-behavior: smooth;
  padding: 10px 0;
  scroll-snap-type: x mandatory;
}

.slider-wrapper::-webkit-scrollbar{
  display: none;
}

.hotel-card {
  /* Keep a fixed card width so the row overflows and stays scrollable.
     Without this (and with the default flex-shrink: 1) all cards squeeze
     into a single row, which leaves nothing to scroll and disables the
     prev/next buttons. */
  flex: 0 0 230px;
  width: 230px;
  cursor: pointer;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  scroll-snap-align: start;
  position: relative;
}

.hotel-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  position: relative;
}

.close-button {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.hotel-info {
  padding: 16px;
}

.hotel-name {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.rating {
  display: inline-flex;
  align-items: center;
  background: #003580;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
  margin-right: 8px;
}

.review-text {
  color: #666;
  font-size: 14px;
}

.location {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #333;
  font-size: 14px;
  margin: 8px 0;
}

.distance {
  align-items: center;
  gap: 4px;
  color: #666;
  font-size: 14px;
}

.star-rating {
  color: #febb02;
  font-size: 20px;
  margin-bottom: 8px;
}

.sold-out {
  color: #e41d1d;
  font-size: 14px;
  margin-top: 12px;
  font-weight: 500;
}
.nav-button-container {
  width: 100%;
  position: absolute;
  inset-block-start: 50%;
  /* transform: translateY(-50%); */
  display: flex;
  justify-content: space-between;
}

.nav-button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition:
    background-color 0.3s,
    transform 0.3s;
  z-index: 10;
}

.nav-button:hover {
  background: #f5f5f5;
  /* transform: translateY(-50%) scale(1.1); */
}

.nav-button:disabled {
  /* opacity: 0.5; */
  cursor: not-allowed;
}

.prev {
  left: -20px;
}

.next {
  right: -20px;
}

@media (max-width: 768px) {
  .header-container {
    padding: 16px;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-left,
  .header-right {
    flex-wrap: wrap;
  }

  .slider-container {
    margin: 16px;
  }

  .nav-button-container {
    display: none;
  }
}
</style>
