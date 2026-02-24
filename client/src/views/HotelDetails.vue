<script>
import TheHeader from '@/components/Header.vue'
import TheFooter from '@/components/Footer.vue'
import MapComponent from '@/components/map/MapComponent.vue'
import axios from 'axios'
import { mapActions, mapGetters } from 'vuex'
import ImageGallery from '@/components/hotel-image/ImageGallery.vue'
import { useToast } from 'vue-toastification'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/css/index.css'

// import ReviewForm from '@/components/review/ReviewForm.vue'
import ReviewValidation from '@/components/review/ReviewValidation.vue'

import errorHandler from '@/request/errorHandler';

export default {
  components: {
    TheHeader,
    TheFooter,
    MapComponent,
    ImageGallery,
    Loading,
    // ReviewForm,
    ReviewValidation
  },
  setup() {
    // Get toast interface
    const toast = useToast()
    // Make it available inside methods
    return { toast }
  },
  data() {
    return {
      hotel_id: null,

      // image gallery
      hotelImages: [],
      initialThumbnailCount: 4,

      // hotel details
      hotel: {},
      room_list: [],
      reviews: [],
      nearbyPlaces: [],
      reviewCriterias: [],

      // selected rooms for booking
      selectedRooms: [],

      // popup
      openCommentPopup: false,
      openMapPopup: false,
      isImageGalleryOpen: false,
      showGuestSelector: false,
      showReviewForm: false,
      showReviewValidation: false,
      // search room
      dateRange: null,
      children: 0,
      adults: 2,
      rooms: 1,
      checkInDate: null,
      checkOutDate: null,
      numberOfDays: null,
      isSearchRoomLoading: false
    }
  },
  computed: {
    ...mapGetters('auth', ['isUserAuthenticated']),
    ...mapGetters('search', ['getSearchData']),
    guestDetails() {
      return `${this.adults} người lớn · ${this.children} trẻ em · ${this.rooms} phòng`
    },
    displayedThumbnails() {
      return this.hotelImages.slice(3, 3 + this.initialThumbnailCount)
    },
    hasMoreImages() {
      return !this.showAll && this.hotelImages.length > 3 + this.initialThumbnailCount
    },
    remainingImages() {
      return this.hotelImages.length - (3 + this.initialThumbnailCount)
    },
    // calculate total number and total price of selected rooms
    totalSelectedRooms() {
      return this.selectedRooms.reduce((total, option) => total + option.roomQuantity, 0)
    },
    totalPriceSelectedRooms() {
      return this.selectedRooms.reduce((total, option) => total + option.totalPrice, 0)
    }
  },
  methods: {
    ...mapActions('book', ['booking', 'checkRoomAvailability']),
    ...mapActions('search', [
      'updateCheckInDate',
      'updateCheckOutDate',
      'updateNumberOfDays',
      'updateAdults',
      'updateRooms',
      'updateChildren'
    ]),
    calculateNumberOfDays(checkInDateString, checkOutDateString) {
      const checkInDate = new Date(checkInDateString)
      const checkOutDate = new Date(checkOutDateString)
      const timeDifference = checkOutDate - checkInDate
      this.numberOfDays = timeDifference / (1000 * 60 * 60 * 24) + 1
    },
    extractDate() {
      const dateRegex = /\b(\d{2}\/\d{2}\/\d{4})\b/g
      const dates = this.dateRange.match(dateRegex)
      if (dates) {
        // Convert the date strings to YYYY-MM-DD format
        for (let i = 0; i < dates.length; i++) {
          // Split the string into parts: [DD, MM, YYYY]
          const [day, month, year] = dates[i].split('/')

          // Rearrange into YYYY-MM-DD format
          dates[i] = `${year}-${month}-${day}`
        }

        this.checkInDate = dates[0]
        this.checkOutDate = dates[1]
        // Calculate the number of days between the start and end dates
        this.calculateNumberOfDays(this.checkInDate, this.checkOutDate)
      }
    },
    async getHotelDetails() {
      try {
        const response = await axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/hotels/get-hotel-details`, {
          hotelId: this.$route.params.hotel_id,
          checkInDate: this.getSearchData.checkInDate,
          checkOutDate: this.getSearchData.checkOutDate,
          numberOfDays: this.getSearchData.numberOfDays,
          numberOfRooms: this.getSearchData.rooms,
          numberOfGuests:
            parseInt(this.getSearchData.adults) + parseInt(this.getSearchData.children)
        })

        this.hotel = response.data.hotel
        this.room_list = response.data.rooms
        this.reviews = response.data.reviews
        this.reviewCriterias = response.data.reviewCriterias
        this.nearbyPlaces = response.data.nearbyPlaces
        this.hotelImages = JSON.parse(this.hotel.image_urls)
      } catch (error) {
        errorHandler(error)
      }
    },
    /******** comment popup *******/
    showCommentPopup() {
      this.openCommentPopup = true
    },
    hideCommentPopup() {
      this.openCommentPopup = false
    },
    /******** review popup *******/
    closeReviewValidation() {
      this.showReviewValidation = false
    },
    /******** map popup ********/
    closeMapPopup() {
      this.openMapPopup = false
    },
    /******** image gallery popup ********/
    openImageGallery() {
      this.isImageGalleryOpen = true
      document.getElementById('hotelDetails').classList.add('no-scroll')
    },
    closeImageGallery() {
      this.isImageGalleryOpen = false
      document.getElementById('hotelDetails').classList.remove('no-scroll')
    },
    /*********** guest selection popup *******/
    toggleGuestSelector() {
      this.showGuestSelector = !this.showGuestSelector
    },
    updateGuests(type, action) {
      if (type === 'adults') {
        if (action === 'increment' && this.adults < 30) this.adults++
        else if (action === 'decrement' && this.adults > 1) this.adults--
      } else if (type === 'children') {
        if (action === 'increment' && this.children < 10) this.children++
        else if (action === 'decrement' && this.children > 0) this.children--
      } else if (type === 'rooms') {
        if (action === 'increment' && this.rooms < 30) this.rooms++
        else if (action === 'decrement' && this.rooms > 1) this.rooms--
      }
    },
    hideGuestSelector() {
      this.showGuestSelector = false
    },
    async applyChange() {
      try {
        this.isSearchRoomLoading = true

        this.extractDate(this.dateRange)
        const response = await axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/hotels/search-room`, {
          hotel_id: this.hotel_id,
          checkInDate: this.checkInDate,
          checkOutDate: this.checkOutDate,
          numberOfDays: this.numberOfDays,
          adults: this.adults,
          children: this.children,
          rooms: this.rooms
        })

        // update search data in store
        this.updateSearchDataInStore()

        this.room_list = response.data.available_rooms
      } catch (error) {
        errorHandler(error);
      } finally {
        this.isSearchRoomLoading = false
      }
    },
    handleRoomSelection(event, room) {
      const quantity = parseInt(event.target.value)

      // Check if a selection already exists for this room
      const existingSelectionIndex = this.selectedRooms.findIndex(
        (option) => option.roomName === room.room_name
      )

      if (quantity === 0) {
        // Remove selection if quantity is set to 0
        if (existingSelectionIndex !== -1) {
          this.selectedRooms.splice(existingSelectionIndex, 1)
        }
      } else {
        const totalPrice = parseInt(quantity * room.price_per_night)

        const selection = {
          room_id: room.room_id,
          roomQuantity: quantity,
          roomName: room.room_name,
          totalPrice: totalPrice
        }

        if (existingSelectionIndex !== -1) {
          // Update the existing selection
          this.selectedRooms[existingSelectionIndex] = selection
        } else {
          // Add new selection
          this.selectedRooms.push(selection)
        }
      }
    },
    // this method will be called when user click book button
    async processBooking() {
      if (this.selectedRooms.length != 0) {
        const bookingInfor = {
          hotel: {
            hotel_id: this.hotel_id,
            name: this.hotel.name,
            address: this.hotel.address,
            overall_rating: this.hotel.overall_rating,
            check_in_time: this.hotel.check_in_time,
            check_out_time: this.hotel.check_out_time
          },
          totalPrice: this.totalPriceSelectedRooms,
          totalRooms: this.totalSelectedRooms,
          selectedRooms: this.selectedRooms,
          numberOfGuests: this.getSearchData.adults,
          checkInDate: this.getSearchData.checkInDate,
          checkOutDate: this.getSearchData.checkOutDate,
          numberOfDays: this.getSearchData.numberOfDays
        }

        this.booking(bookingInfor)

        //TODO: check whether this room is available or not
        // if not available, redirect back to the room selection page
        const isAvailable = await this.checkRoomAvailability()
        if (!isAvailable) {
          this.toast.error('Phòng đã được đặt hết, vui lòng chọn phòng khác!')
          return
        } else {
          // continue if room is available
          this.$router.push('/book')
        }
      }
    },
    writeReview() {
      if (this.isUserAuthenticated) {
        this.showReviewValidation = true
      } else {
        this.$router.push({ path: '/login', query: { redirect: this.$route.path } })
      }
    },
    updateSearchDataInStore() {
      this.updateCheckInDate(this.checkInDate)
      this.updateCheckOutDate(this.checkOutDate)
      this.updateNumberOfDays(this.numberOfDays)
      this.updateAdults(this.adults)
      this.updateRooms(this.rooms)
      this.updateChildren(this.children)
    },
    calculateDistance(lat2, lon2) {
      const toRadians = (degrees) => degrees * (Math.PI / 180)

      const R = 6371000 // Earth's radius in meters
      const φ1 = toRadians(this.hotel.latitude)
      const φ2 = toRadians(lat2)
      const Δφ = toRadians(lat2 - this.hotel.latitude)
      const Δλ = toRadians(lon2 - this.hotel.longitude)

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

      return Math.round(R * c) // Distance in meters
    }
  },
  async mounted() {
    if (this.getSearchData) {
      this.checkOutDate = this.getSearchData.checkOutDate
      this.selectedLocation = this.getSearchData.location
      if (this.getSearchData.checkInDate && this.getSearchData.checkOutDate) {
        let checkInDate = new Date(this.getSearchData.checkInDate).toLocaleDateString('vi-VN')
        let checkOutDate = new Date(this.getSearchData.checkOutDate).toLocaleDateString('vi-VN')

        if (new Date(this.getSearchData.checkInDate).getTime() < new Date().getTime()) {
          checkInDate = new Date().toLocaleDateString('vi-VN')
        }
        if (new Date(this.getSearchData.checkOutDate).getTime() < new Date().getTime()) {
          checkOutDate = new Date(new Date().getTime() + 1000 * 60 * 60 * 24).toLocaleDateString(
            'vi-VN'
          )
        }

        this.dateRange =
          this.$t('userHeader.dateInputPlaceholder_1') +
          ' ' +
          checkInDate +
          ' ' +
          this.$t('userHeader.dateInputPlaceholder_2') +
          ' ' +
          checkOutDate
      }
      this.children = this.getSearchData.children
      this.adults = this.getSearchData.adults
      this.rooms = this.getSearchData.rooms
      this.numberOfDays = this.getSearchData.numberOfDays
      this.checkInDate = this.getSearchData.checkInDate
      // this.checkOutDate = this.getSearchData.checkOutDate
    }

    this.hotel_id = this.$route.params.hotel_id
    // Fetch hotel details using hotelId
    await this.getHotelDetails(),
      // date picker popup
      flatpickr(this.$refs.dateInput, {
        dateFormat: 'd/m/Y', // Định dạng ngày
        locale: 'vn', // Ngôn ngữ tiếng Việt cho tên ngày tháng
        mode: 'range', // Cho phép chọn dải ngày

        minDate: 'today', // Không cho phép chọn ngày trong quá khứ
        showMonths: 2, // Hiển thị 2 tháng cạnh nhau
        onChange: function (selectedDates, dateStr, instance) {},
        mode: 'range',
        locale: {
          rangeSeparator: ' đến ' // Thay "to" bằng "đến"
        },
        onValueUpdate: function (selectedDates, dateStr, instance) {
          // Thêm "Từ" vào trước ngày bắt đầu
          const display = instance.element.value
          instance.element.value = 'Từ ' + display
        }
      })
  }
}
</script>
<template>
  <div id="hotelDetails" class="hotel-details-container">
    <TheHeader :isSearchOpen="true" />
    <MapComponent v-if="openMapPopup" :hotels="[hotel]" @close-map-popup="closeMapPopup" />
    <ImageGallery
      :room_list="room_list"
      :hotelImages="hotelImages"
      :isOpenImageGallery="isImageGalleryOpen"
      @close-image-gallery="closeImageGallery"
    />
    <ReviewValidation
      v-if="showReviewValidation"
      @close="closeReviewValidation"
      :hotelId="this.hotel_id"
      :hotelName="this.hotel.name"
    />
    <!-- menu  -->
    <div class="menu">
      <div class="container">
        <div class="menu__list">
          <ul>
            <li><a href="">Tổng quan</a></li>
            <li><a href="#price">Thông tin & giá</a></li>
            <li>Tiện nghi</li>
            <li><a href="#policy">Chính sách</a></li>
            <li>Ghi chú</li>
            <li><a href="#review">Đánh giá của khách</a></li>
          </ul>
        </div>
      </div>
    </div>

    <!-- end menu  -->

    <!-- overview  -->
    <div class="overview">
      <div class="container">
        <div class="overview__total">
          <div class="overview__image">
            <div class="overview__image--title">
              <h2>{{ hotel.name }}</h2>
              <button>Đặt ngay</button>
            </div>
            <div class="overview__image--location">
              <p><i class="fa-solid fa-location-dot"></i>{{ hotel.address }}</p>
            </div>

            <div class="gallery-container">
              Featured large images
              <div class="featured-images">
                <div class="featured-left" @click="openImageGallery">
                  <img
                    :src="hotelImages[0]"
                    alt="Featured room 1"
                    class="featured-image"
                    v-if="hotelImages.length > 0"
                  />
                </div>
                <div class="featured-right" @click="openImageGallery">
                  <img
                    :src="hotelImages[1]"
                    alt="Featured room 2"
                    class="featured-image"
                    v-if="hotelImages.length > 1"
                  />
                  <img
                    :src="hotelImages[2]"
                    alt="Featured room 3"
                    class="featured-image"
                    v-if="hotelImages.length > 2"
                  />
                </div>
              </div>

              <!-- Thumbnail grid -->
              <div class="thumbnail-grid">
                <div
                  v-for="(image, index) in displayedThumbnails"
                  :key="index"
                  class="thumbnail-item"
                  @click="openImageGallery"
                >
                  <img :src="image" :alt="`Room ${index + 4}`" class="thumbnail-image" />
                </div>
                <div
                  v-if="hasMoreImages"
                  class="thumbnail-item more-images"
                  @click="openImageGallery"
                >
                  <div class="more-overlay">
                    <span>+{{ remainingImages }} ảnh</span>
                  </div>
                  <img
                    :src="hotelImages[displayedThumbnails.length + 3]"
                    :alt="`Room ${displayedThumbnails.length + 4}`"
                    class="thumbnail-image"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- end overview  -->

    <!-- information  -->
    <div class="information">
      <div class="container">
        <div class="information__total">
          <div class="information__text">
            <p>{{ this.hotel.description }}</p>
            <h3>Các tiện nghi được ưa chuộng nhất</h3>
            <ul>
              <li>
                <i class="fa-solid fa-bus"></i>
                <p>Xe đưa đón sân bay</p>
              </li>
              <li>
                <i class="fa-solid fa-ban-smoking"></i>
                <p>Phòng không hút thuốc</p>
              </li>
              <li>
                <i class="fa-solid fa-wifi"></i>
                <p>WiFi miễn phí</p>
              </li>
              <li>
                <i class="fa-solid fa-people-roof"></i>
                <p>Phòng gia đình</p>
              </li>
              <li>
                <i class="fa-solid fa-bell-concierge"></i>
                <p>tân 24 giờ</p>
              </li>
              <li>
                <i class="fa-solid fa-elevator"></i>
                <p>Thang máy</p>
              </li>
              <li>
                <i class="fa-regular fa-snowflake"></i>
                <p>Điều hòa nhiệt độ</p>
              </li>
            </ul>
          </div>
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
        </div>
        <hr />
      </div>
    </div>
    <!-- end information  -->

    <!-- Search bar -->
    <div class="search container">
      <div>
        <div class="search-bar">
          <!-- Date picker input -->
          <div class="date-picker">
            <input
              class="search-input"
              type="text"
              placeholder="Nhận phòng - Trả phòng"
              v-model="dateRange"
              ref="dateInput"
            />
          </div>

          <!-- Guest room input -->
          <div class="guest-room-wrapper" v-click-outside="hideGuestSelector">
            <input
              type="text"
              v-model="guestDetails"
              class="search-input"
              @click="toggleGuestSelector"
              readonly
            />

            <!-- Guest room selector -->
            <div v-if="showGuestSelector" class="guest-room-selector" id="guest-room-selector">
              <div class="selector-item">
                <span>Người lớn</span>
                <div class="counter">
                  <button class="decrement" @click="updateGuests('adults', 'decrement')">-</button>
                  <span>{{ adults }}</span>
                  <button class="increment" @click="updateGuests('adults', 'increment')">+</button>
                </div>
              </div>
              <div class="selector-item">
                <span>Trẻ em <small>(0 - 17 tuổi)</small></span>
                <div class="counter">
                  <button class="decrement" @click="updateGuests('children', 'decrement')">
                    -
                  </button>
                  <span>{{ children }}</span>
                  <button class="increment" @click="updateGuests('children', 'increment')">
                    +
                  </button>
                </div>
              </div>
              <div class="selector-item">
                <span>Phòng</span>
                <div class="counter">
                  <button class="decrement" @click="updateGuests('rooms', 'decrement')">-</button>
                  <span>{{ rooms }}</span>
                  <button class="increment" @click="updateGuests('rooms', 'increment')">+</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Search button -->
          <button class="search-button" @click="applyChange">Áp dụng</button>
        </div>
      </div>
    </div>

    <!-- price -->
    <div class="container" id="price">
      <table>
        <thead>
          <tr class="table_header">
            <th class="table_header_1">Loại chỗ nghỉ</th>
            <th class="table_header_2">Số lượng khách</th>
            <th class="table_header_3">Giá hôm nay</th>
            <th class="table_header_4">Các lựa chọn</th>
            <th class="table_header_5">Chọn phòng</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          <tr class="room_1" v-for="(room, index) in room_list" :key="room.room_id">
            <td>
              <a href="#" class="room-title">{{ room.room_name }}</a>
              <ul class="service">
                <li v-for="(amenity, index) in JSON.parse(room.room_amenities)" :key="index">
                  {{ amenity }}
                </li>
              </ul>
            </td>
            <td>
              <div class="price__customer price__customer--1">
                <i
                  class="fa-solid fa-user"
                  v-for="(guest, index) in room.max_guests"
                  :key="index"
                ></i>
              </div>
            </td>
            <td>
              <div class="price">
                {{ parseInt(room.price_per_night).toLocaleString('vi-VN') }}
              </div>
              <div class="tax-info">Đã bao gồm thuế và phí</div>
            </td>
            <td>
              <ul class="benefits">
                <li>Miễn phí hủy bất kỳ lúc nào</li>
                <li>Không cần thanh toán trước</li>
              </ul>
            </td>
            <td>
              <select @change="handleRoomSelection($event, room)">
                <option value="0" selected>0</option>
                <option v-for="n in room.available_rooms" :key="n" :value="n">
                  {{ n }} (VND {{ parseInt(n * room.price_per_night).toLocaleString('vi-VN') }})
                </option>
              </select>
            </td>
            <td v-if="index === 0" :rowspan="room_list.length">
              <div class="price__content">
                <div class="booking-summary-rooms-and-price">
                  {{ totalSelectedRooms }} Phòng
                  <div class="total-price" style="font-size: 20px">
                    VND {{ totalPriceSelectedRooms.toLocaleString('vi-VN') }}
                  </div>
                </div>
                <button @click="processBooking">Tôi sẽ đặt</button>
                <div style="color: red; font-size: 13px" v-if="selectedRooms.length == 0">
                  Vui lòng chọn phòng trước khi đặt
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <Loading v-model:active="isSearchRoomLoading" :color="`#003b95`" :is-full-page="false" />
      <div v-if="room_list.length == 0" class="no-room-found">
        <h5>Không tìm thấy phòng phù hợp với lựa chọn của bạn.</h5>
      </div>
    </div>

    <!-- end price -->

    <!-- review popup -->
    <div class="review__open" v-if="openCommentPopup">
      <div class="review__open--left"></div>
      <div class="review__open--right">
        <strong>Đánh giá của khách</strong>
        <button class="close" @click="hideCommentPopup()">x</button>
        <div class="review__open--point">
          <span class="point">{{ this.hotel.overall_rating }}</span>
          <div>
            <span style="font-weight: 500">Tuyệt hảo</span>
            <br />
            <span>{{ this.reviews.length }} đánh giá</span>
          </div>
          <p>
            Chúng tôi cố gắng mang đến 100% đánh giá thật <i class="fa-solid fa-circle-info"></i>
          </p>
          <button @click="writeReview">Viết đánh giá</button>
        </div>
        <hr />
        <div class="review__process">
          <strong>Hạng mục</strong>
          <div class="review__process--bar">
            <div class="row">
              <div class="col-lg-4 col-md-6 col-12" v-for="review in reviewCriterias">
                <div class="category">
                  <div>{{ review.criteria_name }}</div>
                  <div>
                    {{ Number((review.average_score / 5) * 10).toFixed(1) }}
                  </div>
                </div>
                <div class="process--bar">
                  <div class="bar" style="width: 92%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <hr />
        <div class="review__number">
          <strong>Bộ lọc</strong>
          <ul>
            <li>
              <p>Khách đánh giá</p>
              <select name="" id="">
                <option value="">Tất cả({{ this.reviews.length }})</option>
                <option value="">Gia đình(11)</option>
                <option value="">Cặp đôi(2)</option>
                <option value="">Khách lẻ(9)</option>
                <option value="">Du khách doanh nhân(1)</option>
              </select>
            </li>
            <li>
              <p>Điểm đánh giá</p>
              <select name="" id="">
                <option value="">Tất cả({{ this.reviews.length }})</option>
                <option value="">Tuyệt hảo: 9+ (19)</option>
                <option value="">Tốt: 7-9 (2)</option>
                <option value="">Tàm tạm: 5-7 (1)</option>
                <option value="">Rất tệ: 1-3 (1)</option>
              </select>
            </li>
            <li>
              <p>Ngôn ngữ</p>
              <select name="" id="">
                <option value="">Tất cả ({{ this.reviews.length }})</option>
                <option value="">Tiếng Việt (6)</option>
                <option value="">Tiếng Anh (6)</option>
                <option value="">Tiếng Hàn Quốc (1)</option>
                <option value="">Tiếng Pháp (5)</option>
              </select>
            </li>
            <li>
              <p>Thời gian trong năm</p>
              <select name="" id="">
                <option value="">Tất cả({{ this.reviews.length }})</option>
                <option value="">Tháng 3-5</option>
                <option value="">Tháng 6-8</option>
                <option value="">Tháng 9-11</option>
                <option value="">Tháng 12-2</option>
              </select>
            </li>
          </ul>
          <p>Chọn chủ để để lọc đánh giá</p>
          <button class="visible"><i class="fa-solid fa-plus"></i> Yên tĩnh</button>
          <button class="visible"><i class="fa-solid fa-plus"></i> Phòng</button>
          <button class="visible"><i class="fa-solid fa-plus"></i> Vị trí</button>
          <button class="visible"><i class="fa-solid fa-plus"></i> Bãi biển</button>

          <button><i class="fa-solid fa-plus"></i> Suite</button>
          <button><i class="fa-solid fa-plus"></i> Gia đình</button>
          <button><i class="fa-solid fa-plus"></i> Xe đạp</button>
          <button><i class="fa-solid fa-plus"></i> Tiếng Anh</button>
          <button><i class="fa-solid fa-plus"></i> Ban công</button>
          <button><i class="fa-solid fa-plus"></i> Nhà hàng</button>
          <button><i class="fa-solid fa-plus"></i> Sạch sẽ</button>
          <button><i class="fa-solid fa-plus"></i> Taxi</button>
          <button><i class="fa-solid fa-plus"></i> Ô tô</button>

          <button class="search visible"><i class="fa-solid fa-magnifying-glass"></i></button>
          <button class="smooth">Thu gọn</button>
          <button class="smooth2 visible">Hiển thị thêm</button>
        </div>
        <hr />
        <strong>Đánh giá của khách</strong>
        <div class="review__open--text" v-for="review in reviews" :key="review.review_id">
          <div class="review__open--infor">
            <div class="name">
              <img
                :src="review.profile_picture_url"
                alt="avatar"
                style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover"
              />
              <div class="infor">
                <span style="font-weight: 600">{{ review.username }}</span>
                <br />
                <span v-if="review.country">{{ review.country }}</span>
                <span v-else>Việt Nam</span>
              </div>
            </div>
            <div>
              <div class="service">
                <i class="fa-solid fa-bed"></i> <span>Nhà 1 phòng ngủ</span>
              </div>
              <div class="service">
                <i class="fa-regular fa-calendar"></i> <span>7 đêm · tháng 3/2023</span>
              </div>
              <div class="service"><i class="fa-solid fa-person"></i> <span>Khách lẻ</span></div>
            </div>
          </div>
          <div class="review__open--desc">
            <div class="point">
              <div>
                <p>Ngày đánh giá: {{ new Date(review.created_at).toLocaleDateString('vi-VN') }}</p>
                <strong v-if="review.rating >= 3">Xuất sắc</strong>
                <strong v-else>Chưa tốt</strong>
              </div>
              <span>{{ review.rating }}</span>
            </div>
            <div class="text">
              <i class="fa-regular fa-face-smile-beam"></i>
              <span> {{ review.comment }}</span>
            </div>
            <div class="button">
              <button><i class="fa-regular fa-thumbs-up"></i> Hữu ích</button>
              <button><i class="fa-regular fa-thumbs-down"></i> Không hữu ích</button>
            </div>
          </div>
        </div>
        <hr />
        <div class="pagination">
          <button><i class="fa-solid fa-arrow-left"></i></button>
          <button>1</button>
          <button>2</button>
          <button>3</button>
          <button><i class="fa-solid fa-arrow-right"></i></button>
        </div>
      </div>
    </div>

    <!-- review -->
    <div class="review" id="review">
      <div class="container">
        <div class="review__total">
          <div class="review__point">
            <div class="review__point--left">
              <h3>Đánh giá của khách</h3>
              <span class="point">{{ this.hotel.overall_rating }}</span>
              <span style="font-weight: 500; margin-left: 5px"
                >Tuyệt hảo - {{ this.reviews.length }} đánh giá
              </span>
            </div>
            <div class="review__point--right">
              <button>Xem phòng trống</button>
            </div>
          </div>
          <div class="review__process">
            <strong>Hạng mục</strong>
            <div class="review__process--bar">
              <div class="row">
                <div class="col-lg-4 col-md-6 col-12" v-for="review in reviewCriterias">
                  <div class="category">
                    <div>{{ review.criteria_name }}</div>
                    <div>
                      {{ Number((review.average_score / 5) * 10).toFixed(1) }}
                    </div>
                  </div>
                  <div class="process--bar">
                    <div class="bar" style="width: 92%"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="review__text">
            <strong>Khách lưu trú ở đây thích điều gì</strong>
            <div class="row">
              <div class="col-xl-4 col-md-6 col-12" v-for="(review, index) in reviews" :key="index">
                <div class="reviewer" v-if="index <= 2">
                  <div class="name">
                    <img :src="review.profile_picture_url" alt="" />
                    <div class="infor">
                      <span style="font-weight: 600">{{ review.username }}</span>
                      <br />
                      <span v-if="review.country">{{ review.country }}</span>
                      <span v-else>Việt Nam</span>
                    </div>
                  </div>
                  <div class="text">
                    <p>“{{ review.comment }}”</p>
                    <a href="">Tìm hiểu thêm</a>
                    <br />
                    <a href="">Xem bản dịch</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button class="btnAll" @click="showCommentPopup()">Đọc tất cả đánh giá</button>
        </div>
      </div>
    </div>
    <!-- end review -->

    <!-- surrounding -->
    <div class="surrounding">
      <div class="container">
        <div class="surrounding__total">
          <div class="sur__title">
            <div class="surrounding__name">
              <h3>Xung quanh khách sạn</h3>
              <a href="">Vị trí tuyệt vời - Hiển thị bản đồ</a>
            </div>
            <div class="sur__button">
              <button>Xem phòng trống</button>
            </div>
          </div>
          <div class="row">
            <div class="col-xl-4 col-md-6 col-12">
              <i class="fa-solid fa-person-walking"></i> <strong>Xung quanh có gì</strong>
              <div
                class="sur__have"
                v-for="place in nearbyPlaces.slice(0, 10)"
                :key="place.place_id"
              >
                <div class="sur__have--item">
                  <div class="sur__have--name">{{ place.place_name }}</div>
                  <div class="sur__have--meters">
                    {{
                      calculateDistance(Number(place.place_latitude), Number(place.place_longitude))
                    }}
                    m
                  </div>
                </div>
              </div>
            </div>
            <div class="col-xl-4 col-md-6 col-12">
              <i class="fa-solid fa-person-walking"></i> <strong></strong>
              <div class="sur__have">
                <div
                  class="sur__have--item"
                  v-for="place in nearbyPlaces.slice(10, 20)"
                  :key="place.place_id"
                >
                  <div class="sur__have--name">{{ place.place_name }}</div>
                  <div class="sur__have--meters">
                    {{
                      calculateDistance(Number(place.place_latitude), Number(place.place_longitude))
                    }}
                    m
                  </div>
                </div>
              </div>
            </div>
            <div class="col-xl-4 col-md-6 col-12">
              <i class="fa-solid fa-person-walking"></i> <strong></strong>
              <div class="sur__have">
                <div
                  class="sur__have--item"
                  v-for="place in nearbyPlaces.slice(20, 30)"
                  :key="place.place_id"
                >
                  <div class="sur__have--name">{{ place.place_name }}</div>
                  <div class="sur__have--meters">
                    {{
                      calculateDistance(Number(place.place_latitude), Number(place.place_longitude))
                    }}
                    m
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- end surrounding -->

    <!-- policy -->
    <div class="policy" id="policy">
      <div class="container">
        <div class="policy__total">
          <div class="policy__title">
            <div class="policy__name">
              <h3>Chính sách</h3>
              <span>Duke Bungalow nhận yêu cầu đặc biệt - gửi yêu cầu trong bước kế tiếp!</span>
            </div>
            <div class="policy__button">
              <button>Xem phòng trống</button>
            </div>
          </div>
          <div class="policy__condition">
            <div class="policy__condition--total">
              <div class="policy__condition--title">
                <i class="fa-solid fa-circle-info"></i> <strong>Hủy đặt phòng/ Trả trước</strong>
              </div>
              <div class="policy__condition--text">
                <p>
                  Các chính sách hủy và thanh toán trước sẽ khác nhau tùy vào từng loại chỗ nghỉ.
                </p>
                <p>
                  Vui lòng kiểm tra <a href="">các điều kiện</a> có thể được áp dụng cho mỗi lựa
                  chọn của bạn.
                </p>
              </div>
            </div>
            <div class="policy__condition--total">
              <div class="policy__condition--title">
                <i class="fa-solid fa-hands-holding-child"></i> <strong>Trẻ em và giường</strong>
              </div>
              <div class="policy__condition--text">
                <p><strong>Chính sách trẻ em</strong></p>
                <p>Phù hợp cho tất cả trẻ em.</p>
                <p>
                  Để xem thông tin giá và tình trạng phòng trống chính xác, vui lòng thêm số lượng
                  và độ tuổi của trẻ em trong nhóm của bạn khi tìm kiếm.
                </p>
                <p><strong>Chính sách trẻ em</strong></p>
                <p>Chỗ nghỉ này không có nôi/cũi và giường phụ.</p>
              </div>
            </div>
            <div class="policy__condition--total">
              <div class="policy__condition--title">
                <i class="fa-solid fa-person"></i> <strong>Không giới hạn độ tuổi</strong>
              </div>
              <div class="policy__condition--text">
                <p>Không có yêu cầu về độ tuổi khi nhận phòng</p>
              </div>
            </div>
            <div class="policy__condition--total">
              <div class="policy__condition--title">
                <i class="fa-solid fa-credit-card"></i>
                <strong>Chỉ thanh toán bằng tiền mặt</strong>
              </div>
              <div class="policy__condition--text">
                <p>Chỗ nghỉ này chỉ chấp nhận thanh toán bằng tiền mặt.</p>
              </div>
            </div>
            <div class="policy__condition--total">
              <div class="policy__condition--title">
                <i class="fa-solid fa-ban-smoking"></i> <strong> Hút thuốc</strong>
              </div>
              <div class="policy__condition--text">
                <p>Không cho phép hút thuốc.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- end policy -->
    <TheFooter />
  </div>
</template>

<style scoped>
.hotel-details-container {
  overflow-x: hidden;
  width: 100vw;
  height: 100vh;
}

.no-scoll {
  overflow-y: hidden;
}
/* menu  */
.menu__list {
  margin: 20px 0;
  border-bottom: 1px solid #777;
}

.menu__list ul {
  display: flex;
  list-style-type: none;
  font-size: 18px;
  font-weight: 400;
  color: #000;
  margin-bottom: 0;
  padding: 0;
}

.menu__list ul li {
  cursor: pointer;
  width: 16.67%;
  text-align: center;
  padding: 15px 0;
}

.menu__list ul li:hover {
  background-color: #f0f6fd;
}

.menu__list ul li:first-child {
  border-bottom: 2px solid #23ace3;
}

/* end menu  */

/* overview  */
.guest-room-dropdown {
  background: #fff;
  border: 1px solid #ccc;
  padding: 10px;
  position: absolute;
  width: 300px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-radius: 5px;
  margin-top: 5px;
}

.overview .counter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}

.overview .counter .number {
  margin: 0 10px;
}

.overview .counter span {
  font-size: 14px;
}

.overview .counter button {
  border: 1px solid #007bff;
  border-radius: 8px;
  width: 25px;
  height: 25px;
  font-size: 16px;
  cursor: pointer;
  background-color: #fff;
  display: inline-flex;
  align-items: center;
}

.overview .closeButton {
  margin-top: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px;
  width: 100%;
  border-radius: 5px;
  cursor: pointer;
}

.overview button[type='button'] {
  width: 100%;
  padding: 12px;
  margin-top: 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
  font-weight: bold;
}

.overview button[type='button']:hover {
  background-color: #0056b3;
}

.overview .map {
  margin: 10px 0;
  /* width: 300px; */
  height: 150px;
  border-radius: 5px;
  overflow: hidden;
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

.overview {
  margin-bottom: 10px;
}
.overview__total {
  display: flex;
  align-items: center;
}

.overview__image {
  flex: 1;
  /* margin-left: 30px; */
  height: 100%;
}

.overview__image--title {
  display: flex;
  justify-content: space-between;
  padding: 0 0 10px 0;
}

.overview__image--title button {
  color: #fff;
  background-color: #0056b3;
  font-weight: 500;
  border: none;
  cursor: pointer;
  border-radius: 5px;
  padding: 0 15px;
}

.overview__image--title h2 {
  margin: 0px;
}

.overview__image i {
  color: #0056b3;
}

.overview__image--header {
  display: flex;
  align-items: center;
}

/* end overview  */

/* information  */
.information {
  margin-bottom: 20px;
}

.information__total {
  display: flex;
}

.information__text {
  flex: 7;
  padding-right: 20px;
}

.information__text ul {
  display: flex;
  list-style-type: none;
  margin: 0;
  padding: 0;
  flex-wrap: wrap;
}

.information__text li {
  display: flex;
  margin-right: 20px;
  width: 20%;
  margin-bottom: 5px;
  flex-wrap: nowrap;
  align-items: center;
}

.information__text li i {
  color: green;
  margin-right: 10px;
}

.information__text li p {
  margin: 0;
  /* white-space: nowrap; */
  font-size: 13px;
}

/* end information  */

/* search */
.search-bar {
  margin-bottom: 15px;
  max-width: 70%;
  background-color: #ffb700;
  height: 40px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-sizing: border-box;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 9999;
}

.search-input {
  height: 100%;
  padding: 0 10px 0 40px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  background-repeat: no-repeat;
  background-position: 10px center;
  background-size: 16px;
  width: 30%;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>');
}

.date-picker {
  width: 40%;
  height: 90%;
}

.date-picker .search-input {
  height: 100%;
  padding: 0 10px 0 40px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  background-repeat: no-repeat;
  background-position: 10px center;
  background-size: 16px;
  width: 100%;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>');
}

.guest-room-wrapper {
  position: relative;
  display: inline-block;
  width: 40%;
  height: 90%;
}

.guest-room-wrapper input {
  width: 100%;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>');
}

#guest-room-selector {
  position: absolute;
  top: 100%;
  left: 0;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 10px;
  z-index: 100;
  width: 100%;
}

.guest-room-wrapper .selector-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.guest-room-wrapper .counter {
  display: flex;
  align-items: center;
}

.guest-room-wrapper button {
  width: 30px;
  height: 30px;
  font-size: 18px;
  text-align: center;
  line-height: 30px;
  border: 1px solid #007bff;
  background-color: #fff;
  color: #007bff;
  border-radius: 4px;
  cursor: pointer;
}

.guest-room-wrapper button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.guest-room-wrapper span {
  margin: 0 10px;
  font-size: 16px;
}

.search-button {
  background-color: #3576d2;
  color: #fff;
  border: none;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: bold;
  border-radius: 4px;
  font-size: 18px;
  width: 18%;
  height: 90%;
}

/* end search  */

/* price  */
table {
  width: 100%;
  border-collapse: collapse;
  font-family: Arial, sans-serif;
}
.table_header_3 {
  background-color: #003b95;
}
th {
  background-color: #4a73b6;
  color: white;
  padding: 12px;
  text-align: center;
  border: 1px solid #ddd;
  font-size: 14px;
}

td {
  padding: 12px;
  border: 1px solid #ddd;
  vertical-align: top;
  border-top: none;
}

.room-title {
  color: #0066cc;
  text-decoration: none;
  font-weight: bold;
}

.price {
  color: #333;
  font-weight: bold;
}

.tax-info {
  color: #666;
  font-size: 12px;
}

.service {
  list-style: none;
  padding: 0;
  margin: 0;
}

.service li {
  margin: 3px 0;
  padding-left: 20px;
  position: relative;
  font-size: 12px;
  color: gray;
}

.service li:before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #4caf50;
}

.room-info {
  color: #2f2f2f;
  font-size: 13px;
  padding: 5px;
}

select {
  padding: 2px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 100px;
}

.benefits {
  list-style: none;
  padding: 0;
}

.benefits li {
  margin: 5px 0;
  padding-left: 20px;
  position: relative;
  font-size: 12px;
  color: green;
}

.benefits li:before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #4caf50;
}
.price__content {
  padding: 0 5px;
  font-size: 13px;
  margin-top: 5px;
  top: 105px;
  position: sticky;
}
.price__content button {
  width: 100%;
  color: white;
  font-weight: 600;
  background-color: #007bff;
  border: none;
  border-radius: 5px;
  padding: 5px 0;
  margin-bottom: 5px;
}
.price__content ul {
  padding-left: 25px;
  margin-bottom: 5px;
}
.price__content b {
  color: green;
  margin-left: 5px;
}

.no-room-found {
  text-align: center;
  margin: 40px;
}

/* end price  */

/* review  */
.review__open {
  overflow-y: scroll;
  display: flex;
  justify-content: space-between;
  height: 100vh;
  width: 100vw;
  position: fixed;
  z-index: 9999;
  background-color: #00000056;
  top: 0px;
  /* display: none; */
}

.review__open--right {
  flex: 1;
  background-color: #fff;
  border-radius: 8px 0 0 8px;
  padding: 20px;
  height: fit-content;
}
.review__open--point {
  display: flex;
  align-items: center;
  position: relative;
}

.review__open--point div {
  margin-right: 30px;
  margin-left: 5px;
}

.review__open--point p {
  margin: 0;
  color: green;
}

.review__open .review__number ul {
  display: flex;
  margin: 0;
  list-style-type: none;
  padding: 0;
  justify-content: space-between;
}

.review__open .review__number ul p {
  margin-bottom: 5px;
}

.review__open .review__number select {
  width: 100%;
  border-radius: 5px;
  padding: 3px 5px;
}

/*  */
.review__open .review__number select:focus {
  border: 1px solid #ddd;
  outline: none;
}

.review__open .review__number li {
  width: 23%;
}
.review__open .review__number p {
  margin-top: 20px;
}
.review__open .review__number button {
  border-radius: 20px;
  padding: 5px 10px;
  margin-bottom: 5px;
  margin-right: 5px;
  border: 1px solid #000;
  background: #fff;
  display: inline-flex;
  align-items: center;
  display: none;
}

.review__open .review__number .visible {
  display: inline-block;
}

.review__open .review__number .smooth {
  border: none;
  border-radius: none;
}

.review__open .review__number .smooth:hover {
  background-color: #dddddd68;
}
.review__open .review__number .smooth2 {
  border: none;
  border-radius: none;
}

.review__open .review__number .smooth2:hover {
  background-color: #dddddd68;
}

.review__open .review__number button i {
  color: #777;
  margin-right: 3px;
}

.review__open .review__number .search {
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: inline-block;
}

.review__open--point button {
  position: absolute;
  right: 0px;
  border: 1px solid #007bff;
  padding: 5px 10px;
  font-size: 14px;
  color: #007bff;
  font-weight: 600;
  background-color: #fff;
  border-radius: 5px;
}

.review__open--point button:hover {
  background-color: #003c9510;
}

.review__open--left {
  width: 40%;
  height: 100%;
}

.review__open--right strong {
  font-size: 20px;
  display: inline-block;
  margin-bottom: 15px;
}

.review__open--point .point {
  padding: 10px;
  background-color: #0056b3;
  color: #fff;
  border-radius: 5px 5px 5px 0;
  font-size: 18px;
  font-weight: 600;
  margin-right: 6px;
}

.review__open--infor {
  width: 30%;
}

.review__open--infor .name {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.review__open--text {
  display: flex;
  margin-bottom: 20px;
}
.review__open--infor .name img {
  width: auto;
  height: 40px;
  border-radius: 50%;
  margin-right: 10px;
}

.pagination {
  padding: 10px 20px;
  border: 1px solid #007bff;
  border-radius: 10px;
}

.pagination button {
  margin-right: 10px;
  border: none;
  background-color: transparent;
  color: #007bff;
  padding: 5px 13px;
  border-radius: 5px;
}

.pagination button:hover {
  background-color: #007bff57;
  color: #fff;
}

.review__open--infor .service i {
  width: 24px;
  text-align: center;
  margin-right: 5px;
}

.review__open--infor .service {
  font-size: 13px;
}

.review__open--desc {
  flex: 1;
}
.review__open--desc .point {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.review__open--desc .text i {
  color: green;
}

.review__open--desc .text {
  margin-bottom: 20px;
}
.review__open--desc .point div p {
  margin-bottom: 5px;
}

.review__open--desc .point div strong {
  margin-bottom: 0;
}

.review__open--desc .point span {
  padding: 8px 10px;
  font-weight: 600;
  color: #fff;
  background-color: #0056b3;
  display: inline-block;
  border-radius: 5px 5px 5px 0;
}

.review__open--desc .button {
  float: right;
}

.review__open--desc .button button i {
  margin-right: 5px;
}

.review__open--desc .button button {
  border: none;
  border-radius: 5px;
  padding: 5px 13px;
  background: #fff;
  color: #007bff;
}

.review__open--desc .button button:hover {
  background-color: #007bff16;
}

.review {
  margin-top: 20px;
}

.review__point {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.review__point h3 {
  font-size: 24px;
  font-weight: bold;
}

.review__point .point {
  padding: 10px;
  font-weight: 600;
  color: #fff;
  background-color: #0056b3;
  display: inline-block;
  border-radius: 5px 5px 5px 0;
}

.review__point--right button {
  border: none;
  padding: 5px 10px;
  color: #fff;
  font-weight: 600;
  background-color: #007bff;
  border-radius: 5px;
}

.review__process--bar .category {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

.review__process--bar .process--bar {
  width: 100%;
  height: 10px;
  border-radius: 5px;
  background-color: #ddd;
  margin: 8px 0px;
  overflow: hidden;
}

.review__process--bar .process--bar .bar {
  background-color: #0056b3;
  height: 100%;
}

.review__process {
  margin-bottom: 10px;
}

.review__text {
  margin-top: 10px;
}

.reviewer {
  margin-top: 10px;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.reviewer .name {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 5px;
}

.reviewer .name img {
  width: auto;
  height: 64px;
  border-radius: 50%;
  margin-right: 10px;
}

.review .btnAll {
  margin-top: 20px;
  border: 1px solid #0056b3;
  background-color: transparent;
  color: #0056b3;
  font-weight: 600;
  padding: 10px 15px;
  border-radius: 5px;
}

.review .btnAll:hover {
  color: #fff;
  background-color: #0056b3;
}

/* end review */

/* surrounding */
.surrounding__total {
  margin-top: 40px;
}

.sur__title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.surrounding__name h3 {
  font-size: 24px;
  font-weight: bold;
}

.sur__button button {
  border: none;
  padding: 5px 10px;
  color: #fff;
  font-weight: 600;
  background-color: #007bff;
  border-radius: 5px;
}

.sur__have--item {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
}

.sur__have--item div {
  font-weight: 400;
  font-size: 13px;
}
/* end surrounding*/

/* policy */

.policy {
  margin: 40px 0px;
}
.policy__title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.policy__name h3 {
  font-size: 24px;
  font-weight: bold;
}

.policy__name {
  margin-bottom: 20px;
}

.policy__button button {
  border: none;
  padding: 5px 10px;
  color: #fff;
  font-weight: 600;
  background-color: #007bff;
  border-radius: 5px;
}

.policy__condition {
  border: 1px solid #ddd;
}

.policy__condition--total {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #dddd;
  padding: 20px 20px 20px 20px;
}

.policy__condition--title {
  padding-right: 40px;
  padding-left: 40px;
  width: 30%;
  display: flex;
  align-items: center;
}

.policy__condition--title i {
  margin-right: 10px;
}

.policy__condition--text {
  flex: 1;
  display: flex;
  justify-content: center;
  flex-direction: column;
}

/* end policy */
.gallery-container {
  padding-left: 0px !important;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.featured-images {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  height: 400px;
}

.featured-left {
  cursor: pointer;
  flex: 1;
}

.featured-right {
  cursor: pointer;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.featured-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.featured-right .featured-image {
  height: calc(50% - 10px);
}

.thumbnail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.thumbnail-item {
  position: relative;
  aspect-ratio: 4/3;
  overflow: hidden;
  border-radius: 8px;
  cursor: pointer;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.more-images {
  cursor: pointer;
}

.more-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  font-weight: 600;
}

@media (max-width: 768px) {
  .featured-images {
    flex-direction: column;
    height: auto;
  }

  .featured-right {
    flex-direction: row;
  }

  .featured-right .featured-image {
    height: 200px;
    width: calc(50% - 10px);
  }
}
</style>
