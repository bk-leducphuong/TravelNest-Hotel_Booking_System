<script>
import ImageSlider from './ImageSlider.vue'

export default {
  components: {
    ImageSlider
  },
  props: {
    room_list: {
      type: Array,
      required: true
    },
    isOpenImageGallery: {
      type: Boolean,
      required: true
    },
    hotelImages: {
      type: Array,
      requied: true
    }
  },
  data() {
    return {
      currentSelectedRoomId: 0,
      currentImages: null,
      isImageSliderOpen: false
    }
  },
  watch: {
    hotelImages(newValue) {
      this.currentImages = newValue
    }
  },
  mounted() {
    this.selectRoom(0)
  },
  methods: {
    // select room
    selectRoom(room) {
      if (room === 0) {
        this.currentImages = this.hotelImages
        this.currentSelectedRoomId = 0
        return
      }
      this.currentSelectedRoomId = room.room_id
      this.currentImages = JSON.parse(room.room_image_urls)
    },
    // close image gallery popup
    closePopup() {
      this.$emit('close-image-gallery')
    },
    // open and close image slider popup
    openImageSlider() {
      this.isImageSliderOpen = true
    },
    closeImageSlider() {
      this.isImageSliderOpen = false
    }
  }
}
</script>
<template>
  <ImageSlider
    v-if="isImageSliderOpen"
    :images="currentImages"
    :is-image-slider-open="isImageSliderOpen"
    @close-image-slider="closeImageSlider"
  />
  <div v-if="isOpenImageGallery" class="overlay">
    <div class="hotel-card">
      <div class="hotel-header">
        <div class="hotel-title">
          <h1 class="hotel-name">Mai Hotel</h1>
          <span class="stars">⭐⭐⭐</span>
          <button class="book-now">Đặt ngay</button>
        </div>

        <button class="close-button" @click="closePopup">&times;</button>
      </div>

      <div class="room-types">
        <div
          class="room-card"
          :class="{ selected: currentSelectedRoomId === 0 }"
          @click="selectRoom(0)"
        >
          <img :src="hotelImages[0]" alt="Overview" class="room-image" />
          <div class="room-info">
            <div class="room-type">Tổng quan</div>
          </div>
        </div>
        <div
          v-for="room in room_list"
          :key="room.room_id"
          class="room-card"
          :class="{ selected: currentSelectedRoomId === room.room_id }"
          @click="selectRoom(room)"
        >
          <img
            :src="JSON.parse(room.room_image_urls)[0]"
            :alt="room.room_name"
            class="room-image"
            referrerpolicy="no-referrer"
          />
          <div class="room-info">
            <div class="room-type">{{ room.room_name }}</div>
          </div>
        </div>
      </div>

      <div class="gallery">
        <img
          v-for="(image, index) in currentImages"
          :key="index"
          :src="image"
          alt="Room 1"
          class="gallery-image"
          @click="openImageSlider"
        />
      </div>
    </div>
  </div>
</template>
<style scoped>
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9;
}

.hotel-card {
  flex-direction: column;
  display: flex;
  position: relative;
  width: 80%;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.hotel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.hotel-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hotel-name {
  font-size: 24px;
  font-weight: 600;
}

.stars {
  color: #ffd700;
}

.book-now {
  background-color: #0066ff;
  color: white;
  padding: 10px 20px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.close-button {
  position: absolute;
  top: 0px;
  right: 10px;
  font-size: 40px;
  background: transparent;
  border: none;
  cursor: pointer;
  z-index: 999;
}

.room-types {
  display: flex;
  gap: 15px;
  overflow-x: auto;
  padding-bottom: 15px;
}

.room-card {
  width: 200px;
  height: 150px;
  border: 2px solid #ccc;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
}

.selected {
  border: 2px solid #0066ff;
}

.room-image {
  width: 100%;
  height: 100%;
  background-color: #eee;
  object-fit: cover;
}

.room-info {
  padding: 12px;
}

.room-type {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.gallery {
  height: 300px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 30px;
  overflow-y: scroll;
}

.gallery-image {
  width: 100%;
  height: 250px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
}
</style>
