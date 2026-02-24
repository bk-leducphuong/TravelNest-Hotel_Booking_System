<script>
import axios from 'axios'
import DashboardMenu from '@/components/admin/DashboardMenu.vue'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import { mapActions, mapGetters } from 'vuex'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/css/index.css'
import errorHandler from '@/request/errorHandler'

export default {
  components: {
    DashboardMenu,
    AdminHeader,
    Loading
  },
  data() {
    return {
      arrangedBookings: [],
      bookings: [],
      isLoading: false,
      rooms: []
    }
  },
  computed: {
    ...mapGetters('manageHotels', ['getCurrentManagingHotelId'])
  },
  methods: {
    ...mapActions('booking', ['setBookingInformation']),
    async getAllBookings() {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/bookings/all`,
          {
            hotelId: this.getCurrentManagingHotelId
          },
          {
            withCredentials: true
          }
        )

        let bookings = response.data.bookings

        // group bookings which have the same booking code
        bookings = this.groupBookings(bookings)

        // assign room information for each corresponding booking
        bookings.forEach((booking) => {
          booking.rooms.forEach((room) => {
            room.roomInformation = this.rooms.find((room) => room.room_id === room.room_id)
          })
        })

        // Fetch booker information for each corresponding booking
        this.bookings = await Promise.all(
          bookings.map(async (booking) => {
            try {
              booking.bookerInformation = await this.getBookerInformation(booking.buyer_id)
            } catch (err) {
              console.error(`Failed to fetch booker info for booking ${booking.id}:`, err)
              booking.bookerInformation = null // Assign null if there's an error
            }
            return booking
          })
        )
      } catch (error) {
        errorHandler(error)
      } 
    },
    groupBookings(bookings) {
      const groupedBookings = new Map()

      bookings.forEach((booking) => {
        const bookingCode = booking.booking_code
        const room = {
          roomId: booking.room_id,
          quantity: booking.quantity
        }

        if (!groupedBookings.has(bookingCode)) {
          groupedBookings.set(bookingCode, {
            booking_code: bookingCode,
            rooms: [room],
            buyer_id: booking.buyer_id,
            checkInDate: booking.check_in_date,
            checkOutDate: booking.check_out_date,
            bookedOn: booking.created_at,
            status: booking.status,
            totalPrice: booking.total_price
          })
        } else {
          groupedBookings.get(bookingCode).rooms.push(room)
        }
      })

      // Convert Map to an array
      return Array.from(groupedBookings.values())
    },
    async getBookerInformation(buyer_id) {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/bookings/get-booker-information`,
          {
            buyer_id: buyer_id
          },
          {
            withCredentials: true
          }
        )
        return response.data.bookerInformation
      } catch (error) {
        errorHandler(error)
      }
    },
    async getAllRooms() {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/room/get-all-rooms`,
          {
            hotelId: this.getCurrentManagingHotelId
          },
          {
            withCredentials: true
          }
        )
        this.rooms = response.data
      }catch(error) {
        errorHandler(error)
      }
    },
    onCancel() {
      console.log('User cancelled the loader.')
    },
    redirectToBookingDetails(bookingCode) {
      this.bookings.forEach((booking) => {
        if (booking.booking_code == bookingCode) {
          this.setBookingInformation(booking)
        }
      })
      this.$router.push({
        path: `/admin/${this.getCurrentManagingHotelId}/bookings/booking-details`,
        query: { bc: bookingCode }
      })
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
    this.isLoading = true
    await this.getAllRooms()
    await this.getAllBookings()
    this.arrangeBookings('all')
    this.isLoading = false
  }
}
</script>
<template>
  <div class="all-bookings-container">
    <DashboardMenu />
    <div class="main-wrapper">
      <!-- top header -->
      <AdminHeader />
      <!-- main content -->
      <div class="main-content">
        <Loading
          v-model:active="isLoading"
          :can-cancel="true"
          :on-cancel="onCancel"
          :color="`#003b95`"
          :is-full-page="false"
        />
        <div class="container">
          <div class="header">
            <div>
              <h1>Booking Lists</h1>
              <div class="booking-count">You have total {{ bookings.length }} bookings.</div>
            </div>
            <div class="actions">
              <button class="export-btn">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export
              </button>
              <button class="add-btn">+</button>
            </div>
          </div>

          <div class="actions">
            <select class="bulk-action" @change="arrangeBookings($event.target.value)">
              <option value="all">Tất cả</option>
              <option value="today">Hôm nay</option>
              <option value="last-week">1 tuần trước</option>
              <option value="last-month">1 tháng trước</option>
              <option value="last-year">1 năm trước</option>
            </select>
            
          </div>

          <table>
            <thead>
              <tr>
                <th><input type="checkbox" /></th>
                <th>ID</th>
                <th>Customer</th>
                <th>Booked On</th>
                <th>Room Type</th>
                <th>Arrive</th>
                <th>Payment</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="booking in arrangedBookings" :key="booking.booking_id">
                <td><input type="checkbox" /></td>
                <td class="booking-code" @click="redirectToBookingDetails(booking.booking_code)">
                  {{ booking.booking_code.slice(0, 5) + '...' }}
                </td>
                <td>
                  <div class="customer-info">
                    <div>
                      <div class="customer-name">{{ booking.bookerInformation.username }}</div>
                      <div class="customer-email">{{ booking.bookerInformation.email }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  {{ new Date(booking.bookedOn).toString().split(' ').splice(0, 3).join(' ') }}
                </td>
                <td>
                  <div v-for="(room, index) in booking.rooms" :key="index">
                    {{ room.quantity }} x {{ room.roomInformation.room_name }}
                  </div>
                </td>
                <td>
                  {{ new Date(booking.checkInDate).toString().split(' ').splice(0, 3).join(' ') }}
                </td>
                <td>
                  <span
                    class="status"
                    :class="{
                      active: booking.status === 'confirmed',
                      cancel: booking.status === 'cancelled'
                    }"
                    >{{ booking.status }}</span
                  >
                </td>
                <td><button class="more-btn">⋮</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.all-bookings-container {
  
  display: flex;
}
/* Main Content Styles */
.main-wrapper {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.main-content {
  /* overflow-y: scroll; */
  padding: 24px;
  position: relative;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header h1 {
  color: #2d3748;
  font-size: 24px;
  font-weight: 600;
}

.booking-count {
  color: #718096;
  font-size: 16px;
  margin-top: 8px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.bulk-action {
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  color: #718096;
  cursor: pointer;
}

.export-btn {
  padding: 8px 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #4a5568;
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-btn {
  padding: 8px 16px;
  background: #6366f1;
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  padding: 12px;
  color: #718096;
  font-weight: 500;
  border-bottom: 1px solid #e2e8f0;
}

td {
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.booking-code {
  color: #003b95;
  cursor: pointer;
}

.booking-code:hover {
  color: #4e82d1;
}

.customer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 500;
}

.avatar.blue {
  background: #6366f1;
}

.avatar.yellow {
  background: #ecc94b;
}

.avatar.navy {
  background: #2c5282;
}

.customer-name {
  font-weight: 500;
  color: #2d3748;
}

.customer-email {
  color: #718096;
  font-size: 14px;
}

.status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}

.status.active {
  background: #c6f6d5;
  color: #38a169;
}

.status.pending {
  background: #fefcbf;
  color: #d69e2e;
}

.status.cancel {
  background: #ed9999;
  color: #ff2c2c;
}

.more-btn {
  background: none;
  border: none;
  color: #718096;
  cursor: pointer;
  font-size: 20px;
}

.vl-parent {
  position: relative;
  height: 100%;
  width: 100%;
}
</style>
