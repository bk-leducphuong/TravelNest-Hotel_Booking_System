<script>
import axios from 'axios'
import { mapGetters } from 'vuex'
import DashboardMenu from '@/components/admin/DashboardMenu.vue'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import RoomBookingChart from '@/components/admin/chart/RoomBookingChart.vue'
import SalesRevenue from '@/components/admin/chart/SalesRevenue.vue'
import errorHandler from '@/request/errorHandler'

export default {
  components: {
    DashboardMenu,
    AdminHeader,
    RoomBookingChart,
    SalesRevenue
  },
  data() {
    return {
      startDate: null,
      endDate: null,
      totalBookings: 0,
      timeSettings: 30, // one month
      roomSales: null,
      newCustomers: null,
      dailyRevenue: null
    }
  },
  computed: {
    ...mapGetters('manageHotels', ['getCurrentManagingHotelId'])
  },
  watch: {
    timeSettings() {
      this.calculateDate()
      this.getTotalBookings()
      this.getRoomSales()
      this.getNewCustomers()
      this.getDailyRevenue()
    }
  },
  mounted() {
    this.calculateDate()
    this.getTotalBookings()
    this.getRoomSales()
    this.getNewCustomers()
    this.getDailyRevenue()
  },
  methods: {
    calculateDate() {
      this.endDate = new Date()
      this.startDate = new Date()
      this.startDate.setDate(this.endDate.getDate() - this.timeSettings)
    },
    async getTotalBookings() {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/home/get-total-bookings`,
          {
            hotelId: this.getCurrentManagingHotelId,
            period: {
              start: this.startDate.toISOString().slice(0, 10),
              end: this.endDate.toISOString().slice(0, 10)
            }
          },
          {
            withCredentials: true
          }
        )

        this.totalBookings = response.data.totalBookings
      } catch (error) {
        errorHandler(error)
      }
    },
    async getRoomSales() {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/home/get-room-book`,
          {
            hotelId: this.getCurrentManagingHotelId,
            period: {
              start: this.startDate.toISOString().slice(0, 10),
              end: this.endDate.toISOString().slice(0, 10)
            }
          },
          {
            withCredentials: true
          }
        )
        this.roomSales = response.data.roomSales
      } catch (error) {
        errorHandler(error)
      }
    },
    async getNewCustomers() {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/home/get-new-customers`,
          {
            hotelId: this.getCurrentManagingHotelId,
            period: {
              start: this.startDate.toISOString().slice(0, 10),
              end: this.endDate.toISOString().slice(0, 10)
            }
          },
          {
            withCredentials: true
          }
        )
        this.newCustomers = response.data.newCustomers
      } catch (error) {
        errorHandler(error)
      }
    },
    async getDailyRevenue() {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/home/get-daily-revenue-chart`,
          {
            hotelId: this.getCurrentManagingHotelId,
            period: {
              start: this.startDate.toISOString().slice(0, 10),
              end: this.endDate.toISOString().slice(0, 10)
            }
          },
          {
            withCredentials: true
          }
        )
        this.dailyRevenue = response.data.dailyRevenueChart
      } catch (error) {
        errorHandler(error)
      }
    }
  }
}
</script>
<template>
  <!-- left dashboard menu-->
  <div class="home-container">
    <DashboardMenu />
    <div class="main-wrapper">
      <!-- top header -->
      <AdminHeader />
      <!-- main content -->
      <div class="main-content">
        <div class="header">
          <h1>Dashboard Overview</h1>
          <div class="header-controls">
            <select v-model="timeSettings">
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="60">Last 60 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <h3 class="card-title">Total Booking</h3>
            <div class="booking-num">
              <span class="booking-value">{{ totalBookings }}</span>
            </div>
            <div class="room-stats">
              <span style="font-size: 20px">bookings in {{ timeSettings }} days</span>
            </div>
          </div>

          <div class="card">
            <h3 class="card-title">Rooms Sales</h3>
            <div class="room-stats" style="display: flex; flex-direction: column; gap: 10px">
              <span v-for="room in roomSales" :key="room.room_id" style="font-size: 20px">
                {{ room.roomName }} : {{ room.book_count }} bookings
              </span>
            </div>
          </div>
        </div>

        <!-- Charts -->
        <div class="chart">
          <RoomBookingChart :room-sales="roomSales" :total-bookings="totalBookings" />
        </div>
        <div class="chart">
          <SalesRevenue :daily-revenue="dailyRevenue" :start-date="startDate" :end-date="endDate" />
        </div>

        <!-- End Charts -->

        <div class="grid">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">New Customer</h3>
            </div>
            <div class="card-content">
              <ul class="customer-list">
                <li
                  v-for="customer in newCustomers"
                  :key="customer.new_customers"
                  class="customer-item"
                >
                  <div class="avatar avatar-ab">
                    <img :src="customer.profile_picture_url" alt="profile_picture_url" />
                  </div>
                  <div class="customer-info">
                    <div class="customer-name">{{ customer.username }}</div>
                    <div class="customer-email">{{ customer.email }}</div>
                  </div>
                  <button class="more-button">⋮</button>
                </li>
              </ul>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h3 class="card-title">Recent Activities</h3>
              <div class="card-actions"></div>
            </div>
            <div class="card-content">
              <ul class="activity-list"></ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.home-container {
  display: flex;
}
/* Main Content Styles */
.main-wrapper {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.notification-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #f8fafc;
  border-radius: 6px;
  color: #64748b;
  font-size: 14px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  margin-right: 12px;
  flex-shrink: 0;
  background-color: gray;
}

.avatar img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.icon-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-button:hover {
  background-color: #f1f5f9;
}

/* Main content styles updated */
.main-content {
  flex-grow: 1;
  background-color: #f8f9fa;
  padding: 24px;
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header h1 {
  font-size: 20px;
  color: #1a1a1a;
}

.header-controls {
  display: flex;
  gap: 12px;
}

select {
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background-color: white;
  cursor: pointer;
}

.reports-btn {
  padding: 8px 16px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

.card {
  background-color: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card-title {
  color: #64748b;
  font-size: 20px;
  margin-bottom: 10px;
}

.booking-num {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 14px;
}

.booking-value {
  font-size: 24px;
  font-weight: 350;
}

.room-stats {
  display: flex;
  gap: 24px;
  color: #64748b;
  font-size: 14px;
}

.graph-placeholder {
  width: 100%;
  height: 120px;
  background-color: #f1f5f9;
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-actions {
  display: flex;
  gap: 16px;
}

.link-btn {
  color: #3b82f6;
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
}

.cancel-btn {
  color: #64748b;
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
}
.customer-list,
.activity-list {
  list-style: none;
}

.customer-item,
.activity-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.customer-item:last-child,
.activity-item:last-child {
  border-bottom: none;
}

.customer-info,
.activity-info {
  flex-grow: 1;
}

.customer-name,
.activity-text {
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 4px;
}

.customer-email,
.activity-time {
  font-size: 13px;
  color: #64748b;
}

.more-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

.more-button:hover {
  background-color: #f1f5f9;
}

.card-content {
  margin-top: 16px;
}

.chart {
  margin: 20px 0px;
}
</style>
