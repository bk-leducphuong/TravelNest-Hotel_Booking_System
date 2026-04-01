<script>
import DashboardMenu from '@/components/admin/DashboardMenu.vue'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import axios from 'axios'
import {mapGetters } from 'vuex'
import { useToast } from 'vue-toastification'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/css/index.css'
import errorHandler from '@/request/errorHandler'

export default {
  components: {
    DashboardMenu,
    AdminHeader,
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
      rooms: [],
      hotelPhotos: [], // main gallery photos
      selectedHotelPhotos: [],
      selectedRoomPhotos: [],
      uploadedRoomPhotos: [],
      uploadedHotelPhotos: [],
      isLoading: false
    }
  },
  computed: {
    ...mapGetters('manageHotels', [
      'getCurrentManagingHotelInformation',
      'getCurrentManagingHotelId'
    ])
  },
  async mounted() {
    await this.getAllRoomPhotos()

    this.hotelPhotos = JSON.parse(this.getCurrentManagingHotelInformation.image_urls)
    // assign index for each photo
    this.hotelPhotos = this.hotelPhotos.map((url, index) => ({
      url,
      index
    }))
  },
  methods: {
    async getAllRoomPhotos() {
      try {
        this.isLoading = true
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/room/get-all-room-photos`,
          {
            hotelId: this.getCurrentManagingHotelId
          },
          {
            withCredentials: true
          }
        )
        this.rooms = response.data

        this.rooms = this.rooms.map((room) => {
          // assign index for each photo
          room.image_urls = JSON.parse(room.image_urls.toString()).map((url, index) => ({
            url,
            index
          }))
          return room
        })

        this.rooms.forEach((room) => {
          // create selectedRoomPhotos for each room
          this.selectedRoomPhotos.push({
            roomId: room.room_id,
            selectedPhotos: []
          })
        })
      } catch (error) {
        errorHandler(error)
      } finally {
        this.isLoading = false
      }
    },
    selectAll(roomId) {
      if (!roomId) {
        this.selectedHotelPhotos = this.hotelPhotos.map((photo) => photo.index)
      } else {
        const room = this.selectedRoomPhotos.find((room) => room.roomId === roomId)
        const originalRoom = this.rooms.find((room) => room.room_id === roomId)
        if (room && originalRoom) {
          room.selectedPhotos = originalRoom.image_urls.map((url) => url.index)
        }
      }
    },
    deselectAll(roomId) {
      if (!roomId) {
        this.selectedHotelPhotos = []
      } else {
        this.selectedRoomPhotos.find((room) => room.roomId === roomId).selectedPhotos = []
      }
    },
    async deleteSelectedPhotos(roomId) {
      try {
        if (!roomId) {
          if (this.selectedHotelPhotos.length > 0) {
            const deletedHotelPhotos = this.hotelPhotos.filter((photo) =>
              this.selectedHotelPhotos.includes(photo.index)
            )
            const deletedHotelPhotosUrls = deletedHotelPhotos.map((photo) => photo.url)
            // Delete selected photos from the main gallery
            this.hotelPhotos = this.hotelPhotos.filter(
              (photo) => !this.selectedHotelPhotos.includes(photo.index)
            )
            this.selectedHotelPhotos = [] // Clear selection

            await axios.post(
              `${import.meta.env.VITE_SERVER_HOST}/api/admin/room/delete-hotel-photos`,
              {
                hotelId: this.getCurrentManagingHotelId,
                deletedHotelPhotosUrls: JSON.stringify(deletedHotelPhotosUrls)
              },
              {
                withCredentials: true
              }
            )
          } else {
            this.toast.error('Vui lòng chọn ảnh cần xóa')
          }
        } else {
          // Delete selected photos for a specific room
          const room = this.rooms.find((room) => room.room_id === roomId)
          const selectedRoom = this.selectedRoomPhotos.find((room) => room.roomId === roomId)
          // Check if there are any selected photos
          if (selectedRoom.selectedPhotos.length === 0) {
            this.toast.error('Vui lòng chọn ảnh cần xóa')
            return
          }
          if (room && selectedRoom) {
            const deletedRoomPhotos = room.image_urls.filter((image) =>
              selectedRoom.selectedPhotos.includes(image.index)
            )
            const deletedRoomPhotosUrls = deletedRoomPhotos.map((photo) => photo.url)

            room.image_urls = room.image_urls.filter(
              (image) => !selectedRoom.selectedPhotos.includes(image.index)
            )
            // Clear the selected photos for this room
            selectedRoom.selectedPhotos = []

            await axios.post(
              `${import.meta.env.VITE_SERVER_HOST}/api/admin/room/delete-room-photos`,
              {
                roomId: roomId,
                deletedRoomPhotosUrls: JSON.stringify(deletedRoomPhotosUrls)
              },
              {
                withCredentials: true
              }
            )
          }
        }
      } catch (error) {
        errorHandler(error)
      }
    },
    triggerFileUpload(roomId) {
      if (roomId) {
        const input = this.$refs[roomId]
        if (input) {
          input[0].click()
        }
      } else {
        this.$refs.hotelPhotoInput.click()
      }
    },
    async addRoomPhotos(roomId, event) {
      try {
        const files = [...event.target.files]

        const formData = new FormData()
        files.forEach((imageFile) => {
          formData.append('images', imageFile)
        })
        formData.append('roomId', roomId)
        formData.append('hotelId', this.getCurrentManagingHotelId)

        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/room/add-room-photos`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            withCredentials: true
          }
        )

        const uploadedImages = response.data.files

        // update room photos
        this.rooms.forEach((room) => {
          if (room.room_id == roomId) {
            const currentIndex = room.image_urls.length - 1
            for (let i = 1; i <= uploadedImages.length; i++) {
              room.image_urls.push({
                index: currentIndex + i,
                url: uploadedImages[i - 1].url
              })
            }
          }
        })
      } catch (error) {
        errorHandler(error)
      }
    },
    async addHotelPhotos(event) {
      try {
        const files = [...event.target.files]
        const formData = new FormData()
        files.forEach((image) => {
          formData.append('images', image)
        })
        formData.append('hotelId', this.getCurrentManagingHotelId)

        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/room/add-hotel-photos`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            withCredentials: true
          }
        )

        const uploadedImages = response.data.files
        // update hotel photos
        const currentIndex = this.hotelPhotos.length - 1
        for (let i = 1; i <= uploadedImages.length; i++) {
          this.hotelPhotos.push({
            index: currentIndex + i,
            url: uploadedImages[i - 1].url
          })
        }
      } catch (error) {
        errorHandler(error)
      }
    }
  }
}
</script>
<template>
  <div class="room-photos-container">
    <DashboardMenu />
    <div class="main-wrapper">
      <!-- top header -->
      <AdminHeader />
      <!-- main content -->
      <div class="main-content">
        <Loading
          v-model:active="isLoading"
          :can-cancel="true"
          :color="`#003b95`"
          :is-full-page="false"
        />
        <div class="container">
          <div class="add-image">
            <div>
              <h1 class="text-header">Main gallery</h1>
              <button class="add-photos-button">Add photos</button>
            </div>
            <div class="action-buttons">
              <span @click="selectAll(null)">Select all</span> |
              <span @click="deselectAll(null)">Deselect all</span> |
              <span @click="deleteSelectedPhotos(null)">Delete</span>
            </div>
          </div>
          <div class="main-photo-grid">
            <div class="photo-grid">
              <div v-for="hotelPhoto in hotelPhotos" :key="hotelPhoto.index" class="photo-cell">
                <div class="photo-container">
                  <img :src="hotelPhoto.url" alt="Photo 1" />
                  <label class="corner-checkbox">
                    <input
                      v-model="selectedHotelPhotos"
                      type="checkbox"
                      class="checkbox"
                      :value="hotelPhoto.index"
                    />
                  </label>
                </div>
              </div>
              <div class="add-photo-box" @click="triggerFileUpload(null)">
                <span>Add photos</span>
              </div>
              <input
                ref="hotelPhotoInput"
                type="file"
                accept="image/jpeg, image/png"
                multiple
                hidden
                @change="addHotelPhotos"
              />
            </div>
          </div>
        </div>
        <div v-for="(room, index) in rooms" :key="room.room_id" class="container">
          <div class="add-image">
            <div>
              <h1 class="text-header">{{ room.room_name }}</h1>
              <p>You need to upload at least 4 photos for each room</p>
            </div>
            <div class="action-buttons">
              <span @click="selectAll(room.room_id)">Select all</span> |
              <span @click="deselectAll(room.room_id)">Deselect all</span> |
              <span @click="deleteSelectedPhotos(room.room_id)">Delete</span>
            </div>
          </div>
          <div class="main-photo-grid">
            <div class="photo-grid">
              <div v-for="roomPhoto in room.image_urls" :key="roomPhoto.index" class="photo-cell">
                <div class="photo-container">
                  <img :src="roomPhoto.url" alt="Photo 1" />
                  <label class="corner-checkbox">
                    <input
                      v-model="selectedRoomPhotos[index].selectedPhotos"
                      :value="roomPhoto.index"
                      type="checkbox"
                      class="checkbox"
                    />
                  </label>
                </div>
              </div>
              <div class="add-photo-box" @click="triggerFileUpload(room.room_id)">
                <span>Add photos</span>
              </div>
              <input
                :ref="room.room_id"
                type="file"
                accept="image/jpeg, image/png"
                multiple
                hidden
                @change="addRoomPhotos(room.room_id, $event)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.room-photos-container {
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
  background-color: #fff;
  border-radius: 10px;
  border: 1px solid #ddd;
  margin-bottom: 20px;
}

.add-image {
  padding-top: 25px;
  padding-bottom: 25px;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}
.action-buttons {
  margin-right: 30px;
}
.action-buttons span {
  color: #007bff;
  margin: 0 5px;
  font-size: 14px;
  cursor: pointer;
}
.action-buttons span:hover {
  text-decoration: underline;
}
.add-image .text-header {
  font-size: 20px;
  padding-bottom: 15px;
}
.add-photos-button {
  display: block;
  padding: 10px 86px;
  background-color: rgb(0, 106, 255);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.add-photos-button:hover {
  background-color: #0056b3;
}
.photo-grid {
  display: grid;
  grid-template-columns: repeat(5, 175px);
  grid-gap: 20px;
  justify-content: center;
  padding: 10px;
}
.photo-cell {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}
.photo-cell img {
  max-width: 100%;
  height: 150px;
  object-fit: cover;
  cursor: pointer;
  border-radius: 8px;
}
.photo-cell img :hover {
  -webkit-transform: scale(1.5);
  transform: scale(1.5);
  -webkit-transition: 0.3s ease-in-out;
  transition: 0.3s ease-in-out;
}
/* Add photo box */
.add-photo-box {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 150px;
  border: 2px dashed #007bff;
  border-radius: 8px;
  background-color: #f8f9fa;
  cursor: pointer;
  text-align: center;
}

.add-photo-box:hover {
  background-color: #e9f2ff;
}

.add-photo-box .add-icon {
  width: 50px;
  height: 50px;
  margin-bottom: 10px;
}

.add-photo-box span {
  font-size: 16px;
  color: #007bff;
  font-weight: 500;
}

/* Modal styles */
.modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  max-width: 80%;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.modal-content .close {
  float: right;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
}

.modal-content h2 {
  margin-bottom: 20px;
}

.modal-content input[type='file'] {
  margin-bottom: 10px;
  width: 100%;
}
.upload-button {
  color: white;
  background-color: rgb(0, 81, 255);
  cursor: pointer;
  padding: 8px 16px;
  border: none;
}

.options-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: none;
  justify-content: center;
  align-items: center;
}

.options-container {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 50%;
  max-width: 100%;
}

.option {
  margin-bottom: 20px;
}
.option1 {
  margin-bottom: 20px;
  display: inline-block;
}
.option label {
  padding: 6px;
}

.tags {
  display: grid;
  grid-template-columns: repeat(3, 100px);
  grid-gap: 10px;
}

.tag {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 6px;
}

.add-tag {
  color: rgb(0, 85, 255);
  cursor: pointer;
}
.option .header {
  padding-bottom: 6px;
  font-weight: 600;
}
.room-options {
  display: flex;
  flex-direction: column;
  padding: 10px;
}
input.largerCheckbox {
  width: 18px;
  height: 18px;
}
.finish-btn {
  display: block;
  margin-left: auto;
  padding: 8px 16px;
  background-color: rgb(0, 81, 255);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.photo-container {
  display: inline-block;
  width: auto;
  height: auto;
}

/* Corner Checkbox */
.corner-checkbox {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  z-index: 2;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.corner-checkbox input[type='checkbox'] {
  appearance: none;
  width: 100%;
  height: 100%;
  margin: 0;
  cursor: pointer;
}

.corner-checkbox input[type='checkbox']:checked {
  background-color: #007bff;
  border-color: #007bff;
  outline: none;
  border-radius: 4px;
}

/* Photo Information */
.photo-info {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.3s;
}

.photo-container:hover .photo-info {
  opacity: 1;
}

.vl-parent {
  position: relative;
  height: 100%;
  width: 100%;
}
</style>
