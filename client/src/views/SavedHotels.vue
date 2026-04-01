<script>
import axios from 'axios'
import TheHeader from '@/components/Header.vue'
import TheFooter from '@/components/Footer.vue'
import { mapGetters } from 'vuex'
import errorHandler from '@/request/errorHandler';
export default {
  components: {
    TheHeader,
    TheFooter
  },
  data() {
    return {
      hotels: [],
      sliderPosition: 0
    }
  },
  computed: {
    ...mapGetters('user', ['getUserInformation']),
    // Check if left scroll should be disabled
    disableScrollLeft() {
      return () => this.sliderPosition === 0
    },
    // Check if right scroll should be disabled
    disableScrollRight() {
      return () => {
        const slider = this.$refs.slider
        if (!slider) return true // Ensure the ref exists
        // Check if the slider is scrolled all the way to the right
        return this.sliderPosition >= slider.scrollWidth - slider.clientWidth
      }
    }
  },
  async mounted() {
    await this.getSavedHotels()
  },
  methods: {
    async getSavedHotels() {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_SERVER_HOST}/api/user/favorite-hotels/get-favorite-hotels`,
          {
            withCredentials: true
          }
        )

        this.hotels = response.data.hotels
      } catch (error) {
        errorHandler(error)
      }
    },
    // Scroll functionality for sliders
    scrollLeft() {
      const slider = this.$refs.slider
      // Ensure the scroll position doesn't go below 0
      this.sliderPosition.set(this.sliderPosition, Math.max(this.sliderPosition - 300, 0))

      slider.scrollTo({ left: this.sliderPosition, behavior: 'smooth' })
    },

    scrollRight() {
      const slider = this.$refs.slider
      // Ensure the scroll position doesn't exceed the rightmost position
      this.sliderPosition.set(
        this.sliderPosition,
        Math.min(this.sliderPosition + 300, slider.scrollWidth - slider.clientWidth)
      )

      slider.scrollTo({ left: this.sliderPosition, behavior: 'smooth' })
    },
    async deleteSavedHotel(hotelId) {
      try {
        const response = await axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/user/favorite-hotels/delete-favorite-hotel`, {
          hotelId: hotelId
        }, {
          withCredentials: true
        })
        if (response.data.success) {
          this.hotels = this.hotels.filter(hotel => hotel.hotel_id !== hotelId)
        }
      }catch(error) {
        errorHandler(error);
      }
    },
     handleScroll(event) {
      const slider = event.target
      this.sliderPosition = slider.scrollLeft
    },
  }
}
</script>
<template>
  <TheHeader :is-search-open="false" />
  <div class="header-container">
    <div class="header-title">
      Saved hotels <span class="info-label">( {{ hotels.length }} properties saved )</span>
    </div>
    <div class="header">
      <div class="header-left">
        <select id="trip-list" class="dropdown">
          <option value="my-next-trip">My next trip</option>
          <option value="summer-trip">Summer Trip</option>
          <option value="weekend-getaway">Weekend Getaway</option>
        </select>
        <button class="btn primary-btn">Share the list</button>
        <button class="btn secondary-btn">Create a list</button>
      </div>
      <div class="header-right">
        <div class="info-group">
          <input type="text" class="date-picker" value="1 Feb - 5 Feb" readonly />
        </div>
        <div class="info-group">
          <input type="text" class="guest-picker" value="1 adult · 1 room" readonly />
        </div>
        <button class="btn map-btn">Show on map</button>
      </div>
    </div>
  </div>
  <div class="slider-container">
    <div ref="slider" class="slider-wrapper" @scroll="handleScroll">
      <div v-for="hotel in hotels" :key="hotel.hotel_id" class="hotel-card">
        <div>
          <img
            :src="JSON.parse(hotel.hotelInformation.image_urls)[0]"
            alt="BlackPink HomeStay"
            class="hotel-image"
          />
          <button class="close-button" @click="deleteSavedHotel(hotel.hotel_id)"><i class="fa fa-times" aria-hidden="true"></i></button>
        </div>
        <div
          class="hotel-info"
          style="display: flex; flex-direction: column; justify-content: space-between"
        >
          <div>
            <h3 class="hotel-name">{{ hotel.hotelInformation.name }}</h3>
            <div class="star-rating">★★★</div>
            <div>
              <span class="rating">{{ hotel.hotelInformation.overall_rating }}</span>
              <span class="review-text">Exceptional · 319 reviews</span>
            </div>
            <div class="location">
              <span><i class="fa fa-map-marker" aria-hidden="true"></i> {{ hotel.hotelInformation.address }}</span>
            </div>
            <div class="distance">2.8 km from centre</div>
          </div>
        </div>
      </div>
    </div>
    <div class="nav-button-container">
      <button class="nav-button prev" :disabled="disableScrollLeft()" @click="scrollLeft()">
        ‹
      </button>
      <button class="nav-button next" :disabled="disableScrollRight()" @click="scrollRight()">
        ›
      </button>
    </div>
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
  max-width: 230px;
  /* flex: 0 0 200px; */
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
</style>
