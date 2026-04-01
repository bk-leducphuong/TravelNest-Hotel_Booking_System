<template>
  <div class="hotel-map">
    <iframe
      :src="mapUrl"
      allowfullscreen=""
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
    ></iframe>
    <button class="map-button" @click="$emit('show-map')">
      <svg class="map-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
        />
      </svg>
      Hiển thị trên bản đồ
    </button>
  </div>
</template>

<script>
export default {
  name: 'HotelMap',
  props: {
    latitude: {
      type: Number,
      default: 21.036897
    },
    longitude: {
      type: Number,
      default: 105.834667
    }
  },
  emits: ['show-map'],
  computed: {
    mapUrl() {
      // Generate dynamic Google Maps embed URL based on coordinates
      return `https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d59582.31596536299!2d${this.longitude}!3d${this.latitude}!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135aba15ec15d17%3A0x620e85c2cfe14d4c!2zTMSDbmcgQ2jhu6cgdOG7i2NoIEjhu5MgQ2jDrSBNaW5o!5e0!3m2!1svi!2sus!4v1729735752435!5m2!1svi!2sus`
    }
  }
}
</script>

<style scoped>
.hotel-map {
  margin: 10px 0;
  height: 150px;
  border-radius: 5px;
  overflow: hidden;
  position: relative;
}

.hotel-map iframe {
  width: 100%;
  height: 100%;
  border: none;
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
</style>
