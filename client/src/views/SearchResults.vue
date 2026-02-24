<script>
import axios from 'axios'
import TheHeader from '@/components/Header.vue'
import MapComponent from '@/components/map/MapComponent.vue'
import TheFooter from '@/components/Footer.vue'
import { mapActions, mapGetters } from 'vuex'
import { useToast } from 'vue-toastification'
import SavedHotelIcon from '@/components/SavedHotelIcon.vue'

import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/css/index.css'
import errorHandler from '@/request/errorHandler'

export default {
  components: {
    TheHeader,
    MapComponent,
    TheFooter,
    SavedHotelIcon,
    Loading
  },
  setup() {
    // Get toast interface
    const toast = useToast()
    // Make it available inside methods
    return { toast }
  },
  data() {
    return {
      noResultsFound: false,
      openMapPopup: false,
      hotels: [], // Kết quả tìm kiếm sẽ được lưu ở đây
      displayHotels: [],
      sortCriteria: '', // default sort criteria
      searchQuery: '', // User's search input,
      filteredHotels: [], // Matching hotels to display
      isLoading: false
    }
  },
  computed: {
    ...mapGetters('search', ['getSearchData']),
    ...mapGetters('auth', ['isUserAuthenticated']),
    sortedHotels() {
      // Sort hotels based on the selected criteria
      return [...this.hotels].sort((a, b) => {
        if (this.sortCriteria === 'priceLowToHigh') {
          return parseFloat(a.lowestPrice) - parseFloat(b.lowestPrice)
        } else if (this.sortCriteria === 'priceHighToLow') {
          return parseFloat(b.lowestPrice) - parseFloat(a.lowestPrice)
        } else if (this.sortCriteria === 'ratingHighToLow') {
          return parseFloat(b.overall_rating) - parseFloat(a.overall_rating)
        }
        return 0
      })
    }
  },
  watch: {
    '$route.query': {
      async handler() {
        if (this.isSearchUrlValid()) {
          // update search data in store if user changes the search url directly
          this.isLoading = true
          this.updateSearchDataInStore()
          await this.saveSearchInformation()
          await this.searchHotels()
          this.isLoading = false
        } else {
          this.toast.error('Vui lòng nhập đầy đủ thông tin tìm kiếm!!')
        }
      },
      immediate: true
    },
    sortedHotels(newValue) {
      this.displayHotels = newValue
    },
    filteredHotels(newValue) {
      if (newValue.length === 0) {
        this.displayHotels = this.sortedHotels
        return
      }
      this.displayHotels = newValue
    }
  },
  methods: {
    ...mapActions('search', [
      'updateLocation',
      'updateCheckInDate',
      'updateCheckOutDate',
      'updateNumberOfDays',
      'updateAdults',
      'updateRooms',
      'updateChildren',
      'saveSearchInformation'
    ]),
    isSearchUrlValid() {
      return this.$route.query.location &&
        this.$route.query.checkInDate &&
        this.$route.query.checkOutDate &&
        this.$route.query.adults &&
        this.$route.query.children &&
        this.$route.query.rooms &&
        this.$route.query.numberOfDays
        ? true
        : false
    },
    updateSearchDataInStore() {
      this.updateLocation(this.$route.query.location)
      this.updateCheckInDate(this.$route.query.checkInDate)
      this.updateCheckOutDate(this.$route.query.checkOutDate)
      this.updateNumberOfDays(this.$route.query.numberOfDays)
      this.updateAdults(this.$route.query.adults)
      this.updateRooms(this.$route.query.rooms)
      this.updateChildren(this.$route.query.children)
    },
    // api query
    async searchHotels() {
      try {
        const response = await axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/search`, {
          searchData: this.getSearchData
        })

        if (response.data.hotels.length === 0) {
          this.noResultsFound = true
        } else {
          this.noResultsFound = false
        }

        this.hotels = response.data.hotels
      } catch (error) {
        errorHandler(error);
      }
    },
    // close the map popup
    closeMapPopup() {
      this.openMapPopup = false
    },
    async redirectToHotelDetails(hotel_id) {
      try {
        // save viewed hotel
        const viewedHotels = localStorage.getItem('viewedHotels')
          ? JSON.parse(localStorage.getItem('viewedHotels'))
          : []

        // Check if the hotel has already been viewed
        const index = viewedHotels.findIndex((hotelId) => hotelId === hotel_id)

        if (index !== -1) {
          // If already viewed, move the hotel to the end of the array (most recent)
          viewedHotels.splice(index, 1) // Remove existing entry
        }
        viewedHotels.push(hotel_id)
        localStorage.setItem('viewedHotels', JSON.stringify(viewedHotels))

        if (this.isUserAuthenticated) {
          await axios.post(
            `${import.meta.env.VITE_SERVER_HOST}/api/home/post-recent-viewed-hotels`,
            {
              hotelId: hotel_id
            },
            { withCredentials: true }
          )
        }

        this.$router.push({ name: 'HotelDetails', params: { hotel_id: hotel_id } })
      } catch (error) {
        errorHandler(error);
      }
    },
    handleSort() {
      // Trigger reactivity by updating the computed property
      // Sorting is handled automatically in the computed property `sortedHotels`
    },
    filterHotels() {
      // Filter hotels based on the search query
      const query = this.searchQuery.toLowerCase()
      this.filteredHotels = this.hotels.filter((hotel) => hotel.name.toLowerCase().includes(query))
    },
    highlightMatch(name) {
      const query = this.searchQuery.trim()
      if (!query) return name
      const regex = new RegExp(`(${query})`, 'gi')
      return name.replace(regex, '<mark style="background-color: #5dabff;">$1</mark>')
    },
    serverHost() {
      return import.meta.env.VITE_SERVER_HOST
    }
  },
  mounted() {
    this.displayHotels = this.sortedHotels
  }
}
</script>
<template>
  <TheHeader :isSearchOpen="true" />
  <MapComponent v-if="openMapPopup" :hotels="hotels" @close-map-popup="closeMapPopup" />
  <!-- inforSearch -->
  <div class="inforSearch">
    <div class="container">
      <Loading
        v-model:active="isLoading"
        :can-cancel="true"
        :color="`#003b95`"
        :is-full-page="false"
      />
      <div class="inner-wrap">
        <div class="row">
          <div class="col-3">
            <div class="map">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d59582.31596536299!2d105.834667!3d21.036897!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135aba15ec15d17%3A0x620e85c2cfe14d4c!2zTMSDbmcgQ2jhu6cgdOG7i2NoIEjhu5MgQ2jDrSBNaW5o!5e0!3m2!1svi!2sus!4v1729735752435!5m2!1svi!2sus"
                allowfullscreen=""
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
              ></iframe>
              <button class="map-button" @click="openMapPopup = !openMapPopup">
                <svg class="map-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                  />
                </svg>
                Hiển thị trên bản đồ
              </button>
            </div>
            <div class="search-select">
              <div class="budget-container">
                <div class="toggle-buttons">
                  <div class="row">
                    <div class="col-md-6 col-12">
                      <button id="per-night-btn" class="active">Mỗi đêm</button>
                    </div>
                    <div class="col-md-6 col-12">
                      <button id="whole-trip-btn">Cả chuyến</button>
                    </div>
                  </div>
                </div>
                <div class="budget-range">
                  <p>
                    <span id="min-value">VND 100.000</span> -
                    <span id="max-value">VND 3.000.000+</span>
                  </p>
                  <div class="range-slider">
                    <input
                      type="range"
                      id="slider-min"
                      min="100000"
                      max="3000000"
                      step="10000"
                      value="100000"
                    />
                    <input
                      type="range"
                      id="slider-max"
                      min="100000"
                      max="3000000"
                      step="10000"
                      value="3000000"
                    />
                  </div>
                </div>
              </div>
              <div class="popular-select">
                <strong>Các bộ lọc phổ biến</strong>
                <br />
                <div class="checkbox">
                  <div class="box-information">
                    <input type="checkbox" />
                    <span>Đặt phòng không cần thẻ tín dụng</span>
                  </div>
                  <div class="amount">1546</div>
                </div>
                <div class="checkbox">
                  <div class="box-information">
                    <input type="checkbox" />
                    <span>Khu phố cổ</span>
                  </div>
                  <div class="amount">463</div>
                </div>
                <div class="checkbox">
                  <div class="box-information">
                    <input type="checkbox" />
                    <span>Hồ bơi riêng</span>
                  </div>
                  <div class="amount">222</div>
                </div>
                <div class="checkbox">
                  <div class="box-information">
                    <input type="checkbox" />
                    <span>Bồn tắm</span>
                  </div>
                  <div class="amount">678</div>
                </div>
                <div class="checkbox">
                  <div class="box-information">
                    <input type="checkbox" />
                    <span>Khách sạn</span>
                  </div>
                  <div class="amount">826</div>
                </div>
                <div class="checkbox">
                  <div class="box-information">
                    <input type="checkbox" />
                    <span>Ban công</span>
                  </div>
                  <div class="amount">1276</div>
                </div>
                <div class="checkbox">
                  <div class="box-information">
                    <input type="checkbox" />
                    <span>Tuyệt hảo: 9 điểm trở lên</span>
                  </div>
                  <div class="amount">619</div>
                </div>
                <div class="checkbox">
                  <div class="box-information">
                    <input type="checkbox" />
                    <span>4 sao</span>
                  </div>
                  <div class="amount">543</div>
                </div>
                <hr />
                <strong>Bữa ăn</strong>
                <div class="checkbox">
                  <div class="box-information">
                    <input type="checkbox" />
                    <span>Tự nấu</span>
                  </div>
                  <div class="amount">1146</div>
                </div>
                <div class="checkbox">
                  <div class="box-information">
                    <input type="checkbox" />
                    <span>Bao gồm bữa sáng</span>
                  </div>
                  <div class="amount">417</div>
                </div>
                <div class="checkbox">
                  <div class="box-information">
                    <input type="checkbox" />
                    <span>Bao bữa sáng & bữa trưa</span>
                  </div>
                  <div class="amount">1</div>
                </div>
                <div class="checkbox">
                  <div class="box-information">
                    <input type="checkbox" />
                    <span>Bao bữa sáng & bữa tối</span>
                  </div>
                  <div class="amount">4</div>
                </div>
              </div>
            </div>
          </div>
          <hr />

          <div class="col-9">
            <div class="inner-content">
              <strong
                >{{ this.$route.query.location }}: {{ $t('searchResults.foundTitle_1') }}
                {{ hotels.length }} {{ $t('searchResults.foundTitle_2') }}</strong
              >
              <div class="arrange">
                <div class="selection-search">
                  <i class="fa-solid fa-repeat"></i>
                  <span>Sắp xếp theo:</span>
                  <!-- Sorting Controls -->
                  <select v-model="sortCriteria" @change="handleSort">
                    <option value="">Lựa chọn hàng đầu của chúng tôi</option>
                    <option value="priceLowToHigh">Giá (ưu tiên thấp nhất)</option>
                    <option value="priceHighToLow">Giá (ưu tiên cao nhất)</option>
                    <option value="ratingHighToLow">Xếp hạng chỗ nghỉ (Cao đến thấp)</option>
                  </select>
                </div>
                <div class="type-search">
                  <input
                    type="text"
                    v-model="searchQuery"
                    placeholder="Search hotels..."
                    @input="filterHotels"
                  />
                  <button>
                    <i
                      class="fa fa-search"
                      aria-hidden="true"
                      style="color: white; cursor: pointer; font-size: larger"
                    ></i>
                  </button>
                </div>
              </div>

              <div v-if="noResultsFound">
                <p>
                  No hotels found matching your criteria. Please try adjusting your search filters.
                </p>
              </div>

              <div
                class="room-infor"
                v-for="hotel in displayHotels"
                :key="hotel.hotel_id"
                @click="redirectToHotelDetails(hotel.hotel_id)"
              >
                <div class="inner-img">
                  <SavedHotelIcon :hotelId="hotel.hotel_id" />
                  <img v-if="hotel.image_urls" :src="JSON.parse(hotel.image_urls)[0]" alt="hotel image" />
                  <img :src="serverHost() + '/uploads/hotels/no-image.png'" alt="hotel image" v-else />
                </div>
                <div class="inner-show">
                  <div class="inner-introduction">
                    <div class="inner-name">
                      <strong class="hotel-name">
                        <span v-html="highlightMatch(hotel.name)"></span
                      ></strong>
                      <br />
                      <div class="address-container">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="currentColor"
                          class="bi bi-geo-alt-fill"
                          viewBox="0 0 16 16"
                        >
                          <path
                            d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6"
                          />
                        </svg>
                        <span class="location" style="margin-left: 5px">{{ hotel.address }}</span>
                      </div>
                    </div>
                    <div class="inner-review">
                      <div class="award">
                        <span>Tốt</span>
                        <br />
                        <span>206 đánh giá</span>
                      </div>
                      <div class="point">
                        {{ hotel.overall_rating }}
                      </div>
                    </div>
                  </div>
                  <div class="inner-infor">
                    <div class="information">
                      <span class="title">Phòng tiêu chuẩn giường đôi</span>
                      <br />
                      <span> 1 giường đôi</span>
                      <br />
                      <span class="desc"><i class="fa-solid fa-check"></i> Miến phí hủy</span>
                      <br />
                      <span class="desc"
                        ><i class="fa-solid fa-check"></i> Không cần thanh toán trước -
                      </span>
                      <span class="desc">Thanh toán tại chỗ nghỉ</span>
                      <br />
                      <p class="last">Chỉ còn 4 phòng với giá này trên trang chúng tôi</p>
                    </div>
                    <div class="price">
                      <span class="people">2 đêm, 2 người lớn</span>
                      <br />
                      <span class="newPrice"
                        >VND {{ parseInt(hotel.lowestPrice).toLocaleString('vi-VN') }}</span
                      >
                      <br />
                      <span class="desc">Đã bao gồm thuế và phí</span>
                      <button>Xem chỗ trống</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <TheFooter />
</template>
<style scoped>
/* searchInfor */
.inforSearch {
  margin-bottom: 50px;
}

.container {
  position: relative;
}

.search-container {
  background-color: #ffc107;
  padding: 20px;
  border-radius: 8px;
  /* width: 300px; */
  margin: 0 auto;
}

.search-container h2 {
  text-align: center;
  color: #fff;
}

label {
  font-weight: bold;
  display: block;
  margin: 10px 0 5px;
}

input[type='text'],
input[type='date'] {
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.guest-room {
  position: relative;
}

.guest-room-dropdown {
  display: none;
  position: absolute;
  background-color: #fff;
  border: 1px solid #ccc;
  width: 100%;
  top: 40px;
  padding: 10px;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
}

#guest-infor {
  width: 100%;
}

.guest-room-dropdown label {
  display: inline-block;
  margin-right: 10px;
}

button {
  padding: 5px 10px;
  margin: 5px;
}

#search-btn {
  width: 100%;
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

#search-btn:hover {
  background-color: #0056b3;
}

.box {
  display: flex;
  justify-content: space-between;
  padding: 0 10px;
}

.minus,
.add {
  border: 1px solid #007bff;
  border-radius: 5px;
  background-color: #fff;
  height: 30px;
  display: flex;
  align-items: center;
  margin: 0 10px;
}

.box div {
  display: flex;
  align-items: center;
}

.closeButton {
  border: 1px solid #007bff;
  border-radius: 5px;
  background-color: #fff;
  width: 100%;
  color: #007bff;
}

.closeButton:hover {
  background-color: #007bff;
  color: #fff;
}

/* end searchInfor */

/* map */
.map {
  margin: 10px 0;
  /* width: 300px; */
  height: 150px;
  border-radius: 5px;
  overflow: hidden;
}

iframe {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 10px;
}

.map-button {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #0066cc;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
  top: -60px;
  margin: auto;
  position: relative;
}

.map-button:hover {
  background-color: #0052a3;
}

.map-icon {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

/* end map */

/* select */
.search-select {
  border-radius: 8px;
  border: 1px solid #ddd;
  /* width: 300px; */
}

.budget-container {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  border-bottom: 1px solid #ddd;
  text-align: center;
}

.toggle-buttons {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.toggle-buttons button {
  padding: 10px 20px;
  border: none;
  background-color: #f0f0f0;
  border-radius: 20px;
  cursor: pointer;
  font-weight: bold;
}

.toggle-buttons .active {
  background-color: #007bff;
  color: white;
}

.budget-range {
  margin-top: 20px;
}

.range-slider {
  position: relative;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.range-slider input[type='range'] {
  width: 100%;
  position: absolute;
  background: transparent;
  pointer-events: none;
  top: 50%;
  /* Căn giữa dọc */
  transform: translateY(-50%);
  /* Giúp căn đều chấm tròn với thanh ngang */
}

input[type='range']::-webkit-slider-runnable-track {
  height: 8px;
  /* Tăng chiều cao của thanh trượt để cân bằng với chấm tròn */
  background: #007bff;
  border-radius: 5px;
  pointer-events: none;
}

input[type='range']::-webkit-slider-thumb {
  pointer-events: all;
  width: 18px;
  height: 18px;
  background: #007bff;
  border-radius: 50%;
  cursor: pointer;
  -webkit-appearance: none;
  position: relative;
  top: 50%;
  /* Căn chỉnh chấm tròn với thanh trượt */
  transform: translateY(-50%);
  /* Đảm bảo nó ở giữa thanh trượt */
}

input[type='range']::-moz-range-thumb {
  pointer-events: all;
  width: 18px;
  height: 18px;
  background: #007bff;
  border-radius: 50%;
  cursor: pointer;
  position: relative;
  top: 50%;
  /* Căn chỉnh chấm tròn với thanh trượt */
  transform: translateY(-50%);
  /* Đảm bảo nó ở giữa thanh trượt */
}

input[type='range']::-moz-range-track {
  height: 8px;
  background: #007bff;
  border-radius: 5px;
}

/* end select */

/* content  */
.inner-content {
  flex: 1;
  padding: 10px 20px;
}

.arrange {
  display: flex;
  justify-content: space-between;
}

.arrange select {
  border-radius: 20px;
  padding: 5px;
}

.inner-content .arrange {
  margin-top: 10px;
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.inner-content .arrange i {
  color: #ddd;
  margin-right: 8px;
}

.inner-content .arrange span {
  margin-right: 8px;
}

.type-search {
  display: flex;
  align-items: center;
}

.type-search input {
  margin: 0px;
  border: none;
  border-radius: 20px;
  padding: 5px;
  border: #ccc 1px solid;
  width: 250px;
}

.type-search button {
  background-color: #007bff;
  border: none;
  cursor: pointer;
  border-radius: 20px;
}

/* end content  */

.checkbox {
  display: flex;
  justify-content: space-between;
  padding: 5px 20px;
}

.amount {
  flex: 1;
  text-align: right;
}

.popular-select strong {
  margin-left: 5px;
}

/* room  */
.room-infor {
  height: 258px;
  display: flex;
  padding: 10px;
  justify-content: space-between;
  border: 1px solid #c7c7cc;
  border-radius: 8px;
  align-items: center;
  margin-bottom: 10px;
  cursor: pointer;
}

.room-infor .inner-img {
  position: relative;
  width: 31%;
  height: 100%;
}

.room-infor .inner-img img {
  width: 100%;
  height: 100%;
  border-radius: 5px;
}

.room-infor .inner-show {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 0 20px;
}

.inner-show {
  height: -webkit-fill-available;
  justify-content: space-between;
}

.hotel-name {
  color: #003b95;
  font-size: 24px;
}

.hotel-name:hover {
  color: black;
}

.room-infor .inner-introduction {
  display: flex;
  justify-content: space-between;
}

.room-infor .inner-review {
  display: flex;
  text-align: right;
  justify-content: space-between;
}

.room-infor .point {
  border: 1px solid #003b95;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px 5px 5px 0;
  margin-left: 15px;
  color: #fff;
  font-weight: 600;
  background-color: #003b95;
}

.room-infor .award span:first-child {
  font-weight: 600;
}

.room-infor .award span:last-child {
  font-size: 12px;
  text-wrap: nowrap;
}

.room-infor .inner-name .no {
  border: 1px solid #0056b3;
  padding: 5px;
  border-radius: 5px;
  font-size: 12px;
}

.room-infor .inner-name .location {
  display: inline-block;
  margin-top: 3px;
  font-size: 12px;
}

.room-infor .inner-infor {
  display: flex;
  justify-content: space-between;
}

.room-infor .inner-infor .information {
  width: 70%;
  font-size: 12px;
  border-left: 1px solid #ddd;
  padding-left: 10px;
}

.room-infor .inner-infor .price {
  flex: 1;
}

.room-infor .inner-infor .information .title {
  font-weight: bold;
  font-size: 16px;
}

.room-infor .inner-infor .information .desc {
  color: green;
  font-weight: 600;
}

.room-infor .inner-infor .information .last {
  font-size: 13px;
  margin-top: 5px;
  font-weight: bold;
  color: red;
}

.room-infor .inner-infor .price {
  font-size: 12px;
  text-align: right;
}

.room-infor .inner-infor .oldPrice {
  color: red;
  font-size: 15px;
  text-decoration: line-through;
}

.room-infor .inner-infor .newPrice {
  font-size: 18px;
  font-weight: 500;
}

.room-infor .inner-infor button {
  border: none;
  color: #fff;
  font-weight: bold;
  background-color: #007bff;
  padding: 10px;
  border-radius: 5px;
}

.room-infor .inner-infor button:hover {
  background-color: #003b95;
}

.address-container {
  display: flex;
}
/* end room  */

/* loading */
.vl-parent {
  position: relative;
  height: 100%;
  width: 100%;
}
</style>
