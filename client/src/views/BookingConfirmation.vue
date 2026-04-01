<script>
import axios from 'axios'
import { useToast } from 'vue-toastification'
import errorHandler from '@/request/errorHandler';
export default {
  setup() {
    // Get toast interface
    const toast = useToast()
    // Make it available inside methods
    return { toast }
  },
  data() {
    return {
      bookingInformation: null
    }
  },
  async mounted() {
    await this.getBookingInformation()
  },
  methods: {
    async getBookingInformation() {
      const bookingCode = this.$route.query.bookingCode
      if (bookingCode) {
        try {
          // get all bookings of user
          const response = await axios.get('http://localhost:3000/api/booking/get-all-bookings', {
            withCredentials: true
          })

          // filter bookings to find booking which has the same bookingCode
          let bookings = response.data.bookings.filter(booking => booking.booking_code == bookingCode)

          bookings = this.groupBookings(bookings)
          
          if (bookings.length > 0) {
            this.bookingInformation = bookings[0]
          }else {
            this.$router.replace({ name: 'NotFound' })
          }

        } catch (error) {
          errorHandler(error)
        }
      } else {
        this.$router.replace({ name: 'NotFound' })
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
  }
}
</script>
<template>
  <!-- header  -->
  <div class="header">
    <div class="" style="padding: 0px 20px">
      <div class="inner-wrap">
        <div class="inner-logo">
          <strong style="cursor: pointer" @click="$router.push('/')">Booking.com</strong>
        </div>
        <div class="inner-login">
          <ul>
            <li><strong>VND</strong></li>
            <li><img src="" alt="" /></li>
            <li><i class="fa-regular fa-circle-question"></i></li>
            <li class="login">Trợ giúp</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
  <!-- end header  -->
  <div v-if="bookingInformation" class="container">
    <div class="success-card">
      <div class="success-header">
        <div class="success-icon"><i class="fa fa-check" aria-hidden="true" style="font-size: 50px; color: green;"></i></div>
        <h1 class="success-title">Your booking is confirmed!</h1>
        <p v-if="bookingInformation">Booking ID: {{ bookingInformation.booking_code }}</p>
      </div>

      <div class="booking-details">
        <div class="detail-section">
          <h2 class="section-title">Hotel Information</h2>
          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-label">Hotel Name</div>
              <div class="detail-value">{{ bookingInformation.hotel.name }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Room Type</div>
              <div v-for="room in bookingInformation.rooms" class="detail-value">{{ room.roomName }} x {{ room.quantity }}</div>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h2 class="section-title">Stay Details</h2>
          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-label">Check-in</div>
              <div class="detail-value">{{ new Date(bookingInformation.checkInDate).toLocaleDateString('vi-VN') }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Check-out</div>
              <div class="detail-value">{{ new Date(bookingInformation.checkOutDate).toLocaleDateString('vi-VN') }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Length of Stay</div>
              <div class="detail-value">3 nights</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Guests</div>
              <div class="detail-value">{{ bookingInformation.numberOfGuests }} Adults</div>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h2 class="section-title">Price Summary</h2>
          <div class="price-summary">
            <div class="price-row">
              <span>Room Rate (3 nights)</span>
              <span>VND {{ parseInt(bookingInformation.totalPrice).toLocaleString('vi-VN') }}</span>
            </div>
            <div class="price-row">
              <span>Taxes & Fees</span>
              <span>VND 0</span>
            </div>
            <div class="price-row total-row">
              <span>Total Amount Paid</span>
              <span>VND {{ parseInt(bookingInformation.totalPrice).toLocaleString('vi-VN') }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="action-buttons">
        <a class="btn btn-primary" @click="$router.push('/')">Home</a>
        <a class="btn btn-secondary">Download Receipt</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* header  */
.header {
  background-color: #003b95;
  margin-bottom: 35px;
}

.header .inner-wrap {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  align-items: center;
}

.header .inner-logo strong {
  font-size: 24px;
  color: #fff;
}

.header .inner-login ul {
  display: flex;
  color: #fff;
  list-style-type: none;
  align-items: center;
  margin-bottom: 0;
}

.header .inner-login ul li {
  padding: 10px;
  margin-left: 15px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 14px;
}

.header .inner-login ul li:hover {
  background-color: #1a4fa0;
}

.header .inner-login ul li img {
  border-radius: 50%;
  height: 18px;
  overflow: hidden;
  width: auto;
}
.header .inner-login ul li span {
  font-weight: 600;
}

.header .inner-login ul .login {
  padding: 5px 10px;
  color: #1d5fc2;
  font-weight: 500;
  background-color: #fff;
  border-radius: 5px;
}
.header .inner-login ul .guides {
  padding: 5px 10px;
  color: #1d5fc2;
  font-weight: 500;
  background-color: #fff;
  border-radius: 5px;
}

.header .inner-login ul .login:hover {
  background-color: #f0f6fde8;
}
.header .inner-login ul .guides:hover {
  background-color: #f0f6fde8;
}
/* end header  */
.container {
  max-width: 800px;
  margin: 40px auto;
  padding: 20px;
}

.success-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 30px;
}

.success-header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #ccc;
}

.success-title {
  color: green;
  font-size: 24px;
  margin-bottom: 10px;
}

.booking-details {
  margin-top: 30px;
}

.detail-section {
  margin-bottom: 30px;
}

.section-title {
  font-size: 18px;
  font-weight: 800;
  margin-bottom: 15px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.detail-item {
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
}

.detail-label {
  font-weight: bold;
  color: #666;
  font-size: 14px;
}

.detail-value {
  color: #333;
  margin-top: 5px;
}

.price-summary {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 4px;
  margin-top: 20px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.total-row {
  border-top: 2px solid #ddd;
  margin-top: 10px;
  padding-top: 10px;
  font-weight: bold;
}

.action-buttons {
  display: flex;
  /* gap: 15px; */
  
  margin-top: 30px;
  justify-content: space-between;
}

.btn {
  padding: 12px 25px;
  border-radius: 4px;
  border: none;
  font-size: 16px;
  cursor: pointer;
  text-decoration: none;
  text-align: center;
  transition: all 0.3s ease;
  font-weight: 700;
}

.btn-primary {
  background-color: #2962ff;
  color: white;
}

.btn-secondary {
  background-color: #fff;
  color: #2962ff;
  border: 1px solid #2962ff;
}

.btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
