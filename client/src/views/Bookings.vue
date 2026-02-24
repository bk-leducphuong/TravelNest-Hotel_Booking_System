<script>
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
import axios from 'axios'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/css/index.css'
import { mapActions } from 'vuex'
import router from '@/router/index.js'

export default {
  components: {
    Header,
    Loading,
    Footer
  },
  data() {
    return {
      arrangedBookings: [],
      bookings: [],
      isLoading: false
    }
  },
  methods: {
    ...mapActions('booking', ['setBookingInformation']),
    async getAllBookings() {
      try {
        this.isLoading = true
        const response = await axios.get('http://localhost:3000/api/booking/get-all-bookings', {
          withCredentials: true
        })
        const bookings = response.data.bookings
        // group bookings which have the same booking code
        this.bookings = this.groupBookings(bookings)
      } catch (error) {
        console.error(error)
      } finally {
        this.isLoading = false
      }
    },
    groupBookings(bookings) {
      const groupedBookings = new Map()

      bookings.forEach((booking) => {
        const bookingCode = booking.booking_code
        const room = {
          roomId: booking.room_id,
          quantity: booking.quantity,
          roomName: booking.roomName
        }
        if (!groupedBookings.has(bookingCode)) {
          groupedBookings.set(bookingCode, {
            booking_code: bookingCode,
            rooms: [room],
            checkInDate: booking.check_in_date,
            checkOutDate: booking.check_out_date,
            bookedOn: booking.created_at,
            hotel: booking.hotel,
            status: booking.status,
            totalPrice: booking.total_price,
            numberOfGuests: booking.number_of_guests
          })
        } else {
          groupedBookings.get(bookingCode).rooms.push(room)
        }
      })

      // Convert Map to an array
      return Array.from(groupedBookings.values())
    },
    seeDetails(bookingCode) {
      this.bookings.forEach((booking) => {
        if (booking.booking_code === bookingCode) {
          this.setBookingInformation(booking)
        }
      })

      router.push({ name: 'BookingDetails', params: { bookingCode: bookingCode } })
    },
    arrangeBookings(criteria) {
      switch (criteria) {
        case 'all':
          this.arrangedBookings = this.bookings
          // Ngày hiện tại
          const today = new Date()

          // Hàm sắp xếp theo ngày gần nhất so với ngày hiện tại
          this.arrangedBookings.sort((a, b) => {
            const dateA = new Date(a.bookedOn)
            const dateB = new Date(b.bookedOn)

            // Tính khoảng cách ngày so với ngày hiện tại
            const diffA = Math.abs(dateA - today)
            const diffB = Math.abs(dateB - today)

            return diffA - diffB // Sắp xếp theo khoảng cách gần nhất
          })

          break
        case 'today':
          this.arrangedBookings = this.bookings
          this.arrangedBookings = this.arrangedBookings.filter(
            (booking) => new Date(booking.bookedOn).toDateString() === new Date().toDateString()
          )
          break
        case 'last-week':
          this.arrangedBookings = this.bookings
          this.arrangedBookings = this.arrangedBookings.filter(
            (booking) =>
              new Date(booking.bookedOn).toDateString().substring(0, 10) ===
              new Date().toDateString().substring(0, 10)
          )
          break
        case 'last-month':
          this.arrangedBookings = this.bookings
          this.arrangedBookings = this.arrangedBookings.filter(
            (booking) =>
              new Date(booking.bookedOn).toDateString().substring(0, 7) ===
              new Date().toDateString().substring(0, 7)
          )
          break
        case 'last-year':
          this.arrangedBookings = this.bookings
          this.arrangedBookings = this.arrangedBookings.filter(
            (booking) =>
              new Date(booking.bookedOn).toDateString().substring(0, 4) ===
              new Date().toDateString().substring(0, 4)
          )
          break
        default:
          this.arrangedBookings = this.bookings
      }
    }
  },
  async mounted() {
    await this.getAllBookings()
    this.arrangeBookings('all')
  }
}
</script>
<template>
  <Header :isSearchOpen="false" />
  <div class="header-container">
    <div class="header-title">Bookings & Trips</div>
    <div class="header">
      <div class="header-left">
        <select class="dropdown" id="trip-list" @change="arrangeBookings($event.target.value)">
          <option value="all">Tất cả</option>
          <option value="today">Hôm nay</option>
          <option value="last-week">1 tuần trước</option>
          <option value="last-month">1 tháng trước</option>
          <option value="last-year">1 năm trước</option>
        </select>
      </div>
    </div>
  </div>
  <div class="account-settings">
    <Loading v-model:active="isLoading" :color="`#003b95`" :is-full-page="false" />
    <br />
    <div v-if="bookings.length == 0" class="no-bookings-found">
      <div>Bạn chưa có đặt phòng nào</div>
    </div>
    <div class="booking-container" v-for="booking in arrangedBookings" :key="booking.booking_id">
      <h3 style="margin-bottom: 5px; font-weight: 700">{{ booking.hotel.city }}</h3>
      <p>
        {{ new Date(booking.bookedOn).toDateString() }}
      </p>
      <div class="booking-content-container">
        <div class="section">
          <div class="hotel-image-container">
            <img :src="JSON.parse(booking.hotel.image_urls)[0]" alt="hotel-image" />
          </div>
          <div style="flex: 1; display: flex; justify-content: space-between">
            <div class="content">
              <h2>{{ booking.hotel.name }}</h2>
              <p>
                {{ new Date(booking.checkInDate).toString().split(' ').slice(0, 4).join(' ') }} -
                {{ new Date(booking.checkOutDate).toString().split(' ').slice(0, 4).join(' ') }}
              </p>
              <p>Free cancellation</p>
              <p
                :class="{
                  active: booking.status === 'confirmed',
                  cancel: booking.status === 'cancelled'
                }"
              >
                {{ booking.status }}
              </p>
            </div>
            <div class="content price-container">
              <h2>VND {{ parseInt(booking.totalPrice).toLocaleString('vi-VN') }}</h2>
              <i class="fa-solid fa-ellipsis-vertical fa-lg"></i>
            </div>
          </div>
        </div>
        <div class="line"></div>
        <div class="see-more-section" @click="seeDetails(booking.booking_code)">
          <i class="fa-solid fa-angle-right fa-xl"></i>
        </div>
      </div>
    </div>
  </div>
  <Footer />
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

.account-settings {
  position: relative;
  /* max-width: 800px; */
  margin: 0 auto;
  padding: 40px;
  padding-top: 0px !important;
  font-family: Arial, sans-serif;
}
.booking-content-container {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  /* box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); */
  cursor: pointer;
  border-radius: 10px;
  margin-bottom: 30px;
}
.section {
  display: flex;
  align-items: initial;
  height: auto;
}

.line {
  width: 95%;
  margin: 0 auto;
  height: 1px;
  background-color: #e5e7eb;
}

.see-more-section {
  border-radius: 0 0 10px 10px;
  text-align: right;
  padding: 17px;
}

.see-more-section:hover {
  background-color: #f3f3f3;
}

.hotel-image-container {
  width: 110px;
  height: 110px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f2f2f2;
  border-radius: 5px;
  margin-right: 20px;
  margin-left: 10px;
  margin-bottom: 10px;
  margin-top: 10px;
}
.hotel-image-container img {
  border-radius: 10px;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.content h2 {
  font-size: 20px;
  margin-bottom: 10px;
  font-weight: bold;
  margin-top: 10px;
  color: #4c4c4c;
}
.content p {
  color: #666;
  margin: 2px;
}
.content {
  display: flex;
  flex-direction: column;
  text-align: justify;
}

.price-container {
  justify-content: space-between;
  text-align: right;
  margin: 5px;
  margin-right: 20px;
  flex-direction: row !important;
  gap: 20px;
  align-items: center;
}

.manage-link {
  color: #4285f4;
  text-decoration: none;

  padding-bottom: 10px;
}
.manage-link:hover {
  text-decoration: underline;
  margin-bottom: 10px;
}
button {
  background-color: white;
  border: none;
  text-align: right;
  color: #666;
  cursor: pointer;
}

.vl-parent {
  position: relative;
  height: 100%;
  width: 100%;
}

.no-bookings-found {
  text-align: center;
  margin: 40px;
}

.no-bookings-found div {
  font-size: 26px;
  font-weight: 700;
}

.active {
  color: #00ff00 !important;
}

.cancel {
  color: #ff2c2c !important;
}
</style>
