<script>
import DashboardMenu from '@/components/admin/DashboardMenu.vue'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import Loading from 'vue-loading-overlay'
import RoomInformation from '@/components/admin/room/RoomInformation.vue'
import 'vue-loading-overlay/dist/css/index.css'
import axios from 'axios'
import { useToast } from 'vue-toastification'
import { mapActions, mapGetters } from 'vuex'
import errorHandler from '@/request/errorHandler'

export default {
  components: {
    DashboardMenu,
    AdminHeader,
    Loading,
    RoomInformation
  },
  setup() {
    const toast = useToast()
    return {
      toast
    }
  },
  data() {
    return {
      rooms: [],
      isLoading: false,
      editRoomMode: false,
      createNewRoomMode: false,
      roomInformation: null
    }
  },
  computed: {
    ...mapGetters('manageHotels', ['getCurrentManagingHotelId'])
  },
  methods: {
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
      } catch (error) {
        errorHandler(error);
      } 
    },
    async editRoomInformation(roomInformation) {
      this.roomInformation = roomInformation
      this.editRoomMode = true
    },
    async createNewRoom() {
      this.roomInformation = null
      this.createNewRoomMode = true
    },
    async deleteRoom(room) {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/room/delete-room`,
          {
            roomId: room.room_id
          },
          {
            withCredentials: true
          }
        )
        this.toast.success('Room deleted successfully')
        this.getAllRooms()
      } catch (error) {
        errorHandler(error);
      }
    },
    serverHost() {
      return import.meta.env.VITE_SERVER_HOST
    }
  },
  async mounted() {
    this.isLoading = true
    await this.getAllRooms()
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

        <RoomInformation
          v-if="editRoomMode || createNewRoomMode"
          :roomInformation="roomInformation"
          :mode="editRoomMode ? 'edit' : 'create'"
        />

        <div class="room-details-container" v-if="!editRoomMode && !createNewRoomMode">
          <div class="title">
            <h2>
              <strong>Room detail</strong>
            </h2>
          </div>
          <div class="room__photos">
            <div class="room__total">
              <div class="row">
                <div class="col-12 col-md-4" v-for="room in rooms" :key="room.room_id">
                  <div class="room__photo--element">
                    <div class="room__image">
                      <img
                        v-if="room.image_urls"
                        :src="JSON.parse(room.image_urls)[0]"
                        alt="phong"
                      />
                      <img
                        v-else
                        :src="serverHost() + '/uploads/hotels/no-image.png'"
                        alt="phong"
                      />
                      <p>{{ room.room_name }}</p>
                    </div>
                    <div class="room__info">
                      <p>
                        Occupancy: <strong>max {{ room.max_guests }} guests</strong>
                      </p>
                      <p>Number of this type: <strong>1</strong></p>
                      <div class="button-container">
                        <button class="edit1" @click="editRoomInformation(room)">Edit</button>
                        <button class="delete1" @click="deleteRoom(room)">Delete</button>
                        <button class="upload__photo">
                          <i class="fa-solid fa-camera"></i> Upload Photo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="col-12 col-md-4" style="display: flex; justify-content: center">
                  <div class="room__photo--element">
                    <div class="add__room" @click="createNewRoom">
                      <h4>Create a new apartment</h4>
                      <i class="fa-solid fa-plus" style="font-size: 30px"></i>
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
  padding: 24px;
  position: relative;
}

.room-details-container {
  max-width: 1200px;
}

.warning {
  margin-top: 20px;
  padding: 20px 60px;
  background-color: rgba(233, 209, 166, 0.405);
  border-radius: 5px;
}

.warning ul {
  padding-left: 40px;
}

.warning ul ul {
  padding-left: 20px;
}

.title {
  flex: 1;
  margin-left: 20px;
}

.room__photos {
  margin-top: 20px;
  margin-left: 20px;
}

.room__photo--element {
  /* padding: 10px; */
  /* overflow: hidden; */
  border: 1px solid #ddd;
  border-radius: 5px;
  margin-bottom: 20px;
}

.room__image img {
  width: 100%;
  height: auto;
  aspect-ratio: 4/3;
  object-fit: cover;
}

.room__image {
  height: 220px;
  position: relative;
}

.room__image p {
  position: absolute;
  bottom: 0px;
  background-color: #2d3748ae;
  width: 100%;
  margin: 0;
  padding: 10px;
  color: white;
}

.room__info {
  padding: 10px;
}

.room__info p {
  /* font-size: 20px; */
  margin-bottom: 15px;
}

.button-container {
  display: flex;
  justify-content: space-between;
}

.button-container button {
  padding: 5px 10px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #4a5568;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 10px;
}

.button-container button:hover {
  color: #003b95;
  background-color: white;
  border: 1px solid #003b95;
}

.button-container .upload__photo {
  background-color: #185dc5;
  color: white;
  border: none;
  cursor: pointer;
}

.button-container .upload__photo:hover {
  background-color: #003b95;
  color: white;
  border: none;
}

.add__room {
  display: flex;
  height: 100%;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  padding: 20px;
  cursor: pointer;
}

.add__room:hover {
  background-color: #e2e8f0;
}

.vl-parent {
  position: relative;
  height: 100%;
  width: 100%;
}
</style>
