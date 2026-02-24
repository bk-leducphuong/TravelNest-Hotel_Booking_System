<script>
import DashboardMenu from '@/components/admin/DashboardMenu.vue'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/css/index.css'
import axios from 'axios'
import { mapActions, mapGetters } from 'vuex'
import errorHandler from '@/request/errorHandler'

export default {
  components: {
    DashboardMenu,
    AdminHeader,
    Loading
  },
  data() {
    return {
      unitArea: 'squareMeter',
      rooms: [],
      recommendRoomAmenities: [
        { amenity: 'Free breakfast', room: [] },
        { amenity: 'Toiletries', room: [] },
        { amenity: 'Welcome snacks & drinks', room: [] },
        { amenity: 'Free Wi-Fi', room: [] },
        { amenity: 'Bathrobes, towels, and slippers', room: [] },
        { amenity: 'TV & telephone', room: [] },
        { amenity: 'Wall outlets', room: [] },
        { amenity: 'Lockers', room: [] },
        { amenity: 'Free parking space', room: [] },
        { amenity: 'Laundry & ironing services', room: [] },
        { amenity: 'Coffee Kit', room: [] },
        { amenity: 'Free parking', room: [] },
        { amenity: 'Gym or fitness center', room: [] }
      ],
      topAmenities: [
        { amenity: 'Air conditioning', room: [] },
        { amenity: 'Kitchenette', room: [] },
        { amenity: 'Kitchen', room: [] },
        { amenity: 'Balcony', room: [] },
        { amenity: 'View', room: [] },
        { amenity: 'Flat screen TV', room: [] },
        { amenity: 'Soundproof', room: [] },
        { amenity: 'Kitchenware', room: [] }
      ],
      isLoading: false
    }
  },
  computed: {
    ...mapGetters('manageHotels', ['getCurrentManagingHotelId'])
  },
  methods: {
    async getAllRoomAmenities() {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/room/get-all-room-amenities`,
          { hotelId: this.getCurrentManagingHotelId },
          { withCredentials: true }
        )
        this.rooms = response.data.map((room) => ({
          ...room,
          room_amenities: room.room_amenities ? JSON.parse(room.room_amenities) : []
        }))
        this.initializeAmenities()
      } catch (error) {
        errorHandler(error);
      }
    },
    initializeAmenities() {
      this.rooms.forEach((room) => {
        room.room_amenities.forEach((amenity) => {
          const topAmenity = this.topAmenities.find((a) => a.amenity === amenity)
          const recommendAmenity = this.recommendRoomAmenities.find((a) => a.amenity === amenity)
          if (topAmenity) topAmenity.room.push(room.room_id)
          if (recommendAmenity) recommendAmenity.room.push(room.room_id)
        })
      })
    },
    processAmenities(amenities, action) {
      amenities.forEach((amenityObj) => {
        if (action === 'add') {
          amenityObj.room = this.rooms.map((room) => room.room_id)
        } else if (action === 'delete') {
          amenityObj.room = []
        }
      })
    },
    addAll(amenityName) {
      this.updateAmenityRooms(amenityName, 'add')
    },
    deleteAll(amenityName) {
      this.updateAmenityRooms(amenityName, 'delete')
    },
    updateAmenityRooms(amenityName, action) {
      const updateAmenity = (amenities) => {
        const amenityObj = amenities.find((amenity) => amenity.amenity === amenityName)
        if (amenityObj) {
          this.processAmenities([amenityObj], action)
        }
      }
      updateAmenity(this.topAmenities)
      updateAmenity(this.recommendRoomAmenities)
    },
    async saveAllAmenities() {
      try {
        this.isLoading = true
        this.rooms.forEach((room) => {
          room.room_amenities = []
        })

        // Hàm xử lý tiện ích cho từng nhóm
        const processAmenities = (amenities) => {
          amenities.forEach((amenityObj) => {
            amenityObj.room.forEach((roomId) => {
              this.rooms.forEach((room) => {
                if (room.room_id === roomId) {
                  room.room_amenities.push(amenityObj.amenity)
                }
              })
            })
          })
        }

        processAmenities(this.topAmenities)
        processAmenities(this.recommendRoomAmenities)

        const updatedRooms = this.rooms.map((room) => ({
          ...room,
          room_amenities: JSON.stringify(room.room_amenities)
        }))

        await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/room/update-room-amenities`,
          { rooms: updatedRooms },
          { withCredentials: true }
        )
      } catch (error) {
        errorHandler(error);
      } finally {
        this.isLoading = false
      }
    }
  },

  async mounted() {
    this.isLoading = true
    await this.getAllRoomAmenities()
    this.isLoading = false
  },

  async beforeUnmount() {
    await this.saveAllAmenities()
  }
}
</script>

<template>
  <div class="room-amenities-container">
    <DashboardMenu />
    <div class="main-wrapper">
      <!-- top header -->
      <AdminHeader />
      <!-- main content -->
      <div class="main-content">
        <div class="container">
          <Loading
            v-model:active="isLoading"
            :can-cancel="true"
            :on-cancel="onCancel"
            :color="`#003b95`"
            :is-full-page="false"
          />
          <h1>Room Size</h1>
          <p>We display your room size to guests on your Booking.com property page.</p>

          <div class="space-y-6">
            <!-- Measurement Unit Selection -->
            <div class="form-group">
              <h2>What's your preferred unit of measurement?</h2>
              <div class="switch-toggle" id="donvi">
                <span
                  @click="unitArea = 'squareMeter'"
                  :class="{ active: unitArea === 'squareMeter' }"
                  >square meter</span
                >
                <span
                  @click="unitArea = 'squareFeet'"
                  :class="{ active: unitArea === 'squareFeet' }"
                  >square feet</span
                >
              </div>
            </div>
            <br />
            <br />
            <br />
            <!-- Room Size Input -->
            <div class="form-group">
              <h2>Please enter the size of your room(s).</h2>
              <div class="input-group">
                <label style="width: 30%" v-for="room in rooms" :key="room.room_id">
                  <span>{{ room.room_name }}</span>
                  <input type="number" v-model="room.room_size" id="deluxe-two-bedroom-suite" />
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Amenities -->
        <div class="container">
          <Loading v-model:active="isLoading" :color="`#003b95`" :is-full-page="false" />
          <h1>Top Amenities</h1>
          <p>
            We know these amenites encourage guests to book. Let them know what you have by
            answering yes or no to each question
          </p>
          <div
            style="display: flex; border-bottom: 1px solid #8a8a8a"
            v-for="amenity in topAmenities"
            :key="amenity.amenity"
          >
            <div style="width: 50%">
              <h2>{{ amenity.amenity }}</h2>
            </div>
            <div
              style="
                align-content: center;
                padding-top: 20px;
                padding-bottom: 20px;
                display: flex;
                flex-direction: column;
              "
            >
              <div class="switch-toggle switch-3 switch-candy" id="1">
                <span
                  :class="{ active: amenity.room.length == this.rooms.length }"
                  @click="addAll(amenity.amenity)"
                  >All apartments</span
                >
                <span
                  :class="{
                    active: amenity.room.length > 0 && amenity.room.length < this.rooms.length
                  }"
                  >Some apartments</span
                >
                <span
                  :class="{ active: amenity.room.length == 0 }"
                  @click="deleteAll(amenity.amenity)"
                  >None</span
                >
              </div>
              <br />
              <div style="display: flex; flex-direction: column">
                <h2>Select where this amenity is available</h2>

                <label class="container1" v-for="room in rooms" :key="room.room_id"
                  >{{ room.room_name }}
                  <input type="checkbox" v-model="amenity.room" :value="room.room_id" />
                  <span class="checkmark"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
        <!-- Room Amenities -->

        <!-- Top Amenities -->
        <div class="container">
          <Loading
            v-model:active="isLoading"
            :can-cancel="true"
            :on-cancel="onCancel"
            :color="`#003b95`"
            :is-full-page="false"
          />
          <h1>Room Amenities</h1>
          <p>
            We know these amenites encourage guests to book. Let them know what you have by
            answering yes or no to each question
          </p>
          <div
            style="display: flex; border-bottom: 1px solid #8a8a8a"
            v-for="amenity in recommendRoomAmenities"
            :key="amenity.amenity"
          >
            <div style="width: 50%">
              <h2>{{ amenity.amenity }}</h2>
            </div>
            <div
              style="
                align-content: center;
                padding-top: 20px;
                padding-bottom: 20px;
                display: flex;
                flex-direction: column;
              "
            >
              <div class="switch-toggle switch-3 switch-candy" id="1">
                <span
                  :class="{ active: amenity.room.length == this.rooms.length }"
                  @click="addAll(amenity.amenity)"
                  >All apartments</span
                >
                <span
                  :class="{
                    active: amenity.room.length > 0 && amenity.room.length < this.rooms.length
                  }"
                  >Some apartments</span
                >
                <span
                  :class="{ active: amenity.room.length == 0 }"
                  @click="deleteAll(amenity.amenity)"
                  >None</span
                >
              </div>
              <br />
              <div style="display: flex; flex-direction: column">
                <h2>Select where this amenity is available</h2>

                <label class="container1" v-for="room in rooms" :key="room.room_id"
                  >{{ room.room_name }}
                  <input type="checkbox" v-model="amenity.room" :value="room.room_id" />
                  <span class="checkmark"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.room-amenities-container {
  display: flex;
}
/* Main Content Styles */
.main-wrapper {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.main-content {
  padding: 24px;
  position: relative;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  background-color: #fff;
  border-radius: 0.5rem;
  border: 1px solid #ccc;
  font-family: Arial, sans-serif;
  margin-bottom: 20px;
  position: relative;
}

h1 {
  font-size: 1.875rem;
  line-height: 2.25rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
}

p {
  color: #4b5563;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

h2 {
  font-size: 1.25rem;
  line-height: 1.75rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.input-group {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.radio-group label,
.input-group label {
  display: flex;
  align-items: left;
  gap: 0.5rem;
  font-weight: 500;
  color: #374151;
  flex-direction: column;
}

.input-group input[type='number'] {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  line-height: 1.5rem;
  border: 1px solid #bababa;
  border-radius: 0.375rem;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.input-group input[type='number']:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}
.switch-toggle {
  float: left;
  background: none;
  border: #4285f4 2px solid;
  border-left: none;
  border-radius: 5px;
  position: relative;
}

.switch-3 {
  display: flex;
  /* justify-content: space-between; */
}

.switch-toggle span {
  display: block;
  /* width: 50%; */
  float: left;
  text-align: center;
  cursor: pointer;
  color: #4285f4;
  padding: 10px 15px;
  border-left: #2196f3 solid 2px;
}

.active {
  background: #4285f4;
  color: white !important;
}

.container1 {
  display: block;
  position: relative;
  padding-left: 35px;
  margin-bottom: 12px;
  cursor: pointer;
  font-size: 16px;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

/* Hide the browser's default checkbox */
.container1 input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

/* Create a custom checkbox */
.checkmark {
  position: absolute;
  top: 0;
  left: 0;
  height: 25px;
  width: 25px;
  background-color: #eee;
}

/* On mouse-over, add a grey background color */
.container1:hover input ~ .checkmark {
  background-color: #ccc;
}

/* When the checkbox is checked, add a blue background */
.container1 input:checked ~ .checkmark {
  background-color: #2196f3;
}

/* Create the checkmark/indicator (hidden when not checked) */
.checkmark:after {
  content: '';
  position: absolute;
  display: none;
}

/* Show the checkmark when checked */
.container1 input:checked ~ .checkmark:after {
  display: block;
}

/* Style the checkmark/indicator */
.container1 .checkmark:after {
  left: 9px;
  top: 5px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 3px 3px 0;
  -webkit-transform: rotate(45deg);
  -ms-transform: rotate(45deg);
  transform: rotate(45deg);
}
</style>
