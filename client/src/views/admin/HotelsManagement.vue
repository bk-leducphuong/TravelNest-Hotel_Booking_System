<script>
import axios from 'axios'
import { mapActions, mapGetters } from 'vuex'
import LoginHeader from '@/components/LoginHeader.vue'

export default {
  components: {
    LoginHeader
  },
  data() {
    return {}
  },
  computed: {
    ...mapGetters('manageHotels', ['getManagingHotels'])
  },
  methods: {
    ...mapActions('manageHotels', ['getAllManagingHotels', 'selectHotelToManage']),
    selectHotel(hotelId) {
      this.selectHotelToManage(hotelId)
      this.$router.push(`/admin/${hotelId}/home`)
    },
    serverHost() {
      return import.meta.env.VITE_SERVER_HOST
    }
  },
  async mounted() {
    await this.getAllManagingHotels()
  }
}
</script>
<template>
  <!-- header  -->
  <LoginHeader :is-admin-login="false" />
  <!-- end header  -->
  <div class="container">
    <div class="header">
      <h1>Hotel Management</h1>
      <button class="add-hotel-btn" @click="$router.push('/join/become-a-host')">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add New Hotel
      </button>
    </div>

    <div class="search-box">
      <input type="text" class="search-input" placeholder="Search hotels..." />
      <button class="filter-btn">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        Filters
      </button>
    </div>

    <div v-if="getManagingHotels == []">
      <div
        v-if="getManagingHotels.length == 0"
        class="not-found-hotels"
        style="margin-top: 80px; text-align: center; font-size: 30px; font-weight: 700"
      >
        <span>Bạn chưa đăng khách sạn nào</span>
      </div>
    </div>

    <div class="hotel-grid">
      <!-- Hotel Card 1 -->

      <div v-for="hotel in getManagingHotels" :key="hotel.hotel_id" class="hotel-card">
        <img v-if="JSON.parse(hotel.image_urls)" :src="JSON.parse(hotel.image_urls)[0]" alt="hotel-image" class="hotel-image" />
        <img v-else :src="serverHost() + '/uploads/hotels/no-image.png'" class="hotel-image" alt="no image">
        <div class="hotel-info">
          <h2 class="hotel-name">{{ hotel.name }}</h2>
          <div class="hotel-location">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {{ hotel.address }}
          </div>
          <!-- <div class="hotel-stats"></div> -->
          <div class="hotel-actions">
            <button class="action-btn manage-btn" @click="selectHotel(hotel.hotel_id)">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Manage
            </button>
            <button class="action-btn view-btn">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              View
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.container {
  max-width: 1200px;
  margin: 20px auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header h1 {
  color: #2d3748;
  font-size: 24px;
  font-weight: 600;
}

.add-hotel-btn {
  padding: 10px 20px;
  background: #1d5fc2;
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.hotel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 24px;
  padding: 10px;
}

.hotel-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease;
}

.hotel-card:hover {
  transform: translateY(-4px);
}

.hotel-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.hotel-info {
  padding: 20px;
}

.hotel-name {
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 8px;
}

.hotel-location {
  color: #718096;
  font-size: 14px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.hotel-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-weight: 600;
  color: #2d3748;
}

.stat-label {
  font-size: 12px;
  color: #718096;
}

.hotel-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.manage-btn {
  background: #1d5fc2;
  color: white;
}

.view-btn {
  background: #e2e8f0;
  color: #4a5568;
}

.search-box {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
}

.search-input {
  flex: 1;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
}

.filter-btn {
  padding: 12px 20px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #4a5568;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
