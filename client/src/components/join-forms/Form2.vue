<script>
import { mapActions, mapGetters, mapState } from 'vuex'
import { LMap, LTileLayer, LMarker, LPopup } from '@vue-leaflet/vue-leaflet'
import * as L from 'leaflet'
export default {
  components: {
    LMap,
    LTileLayer,
    LMarker
  },
  data() {
    return {
      openMapPopup: false,
      zoom: 6,
      center: [14.058324, 108.277199], // Default to London
      markerPosition: null, // Position of the clicked marker
      tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      tileAttribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }
  },
  computed: {
    ...mapGetters('join', ['getJoinFormData']),
    checkForNext() {
      return this.getJoinFormData.coordinates.latitude && this.getJoinFormData.coordinates.longitude
        ? true
        : false
    }
  },
  watch: {
    markerPosition(newValue) {
      this.getJoinFormData.coordinates.latitude = newValue.lat
      this.getJoinFormData.coordinates.longitude = newValue.lng
    }
  },
  methods: {
    goNext() {
      this.$emit('next')
    },
    onMapClick(event) {
      // Get latitude and longitude of the clicked point
      this.markerPosition = event.latlng
      // this.openMapPopup = false
    }
  }
}
</script>
<template>
  <form class="multi-step-form" style="margin-bottom: 40px;" v-if="!openMapPopup">
    <!--  form-2  -->
    <div class="card">
      <div class="map-section">
        <h1 class="title">Ghim vị trí chỗ nghỉ quý vị</h1>
        <p class="sub-title">
          Đây là vị trí mà khách sẽ thấy trên trang web của chúng tôi. Di chuyển bản đồ để tìm vị
          trí chính xác của chỗ nghỉ, sau đó nhấn để thả ghim.
        </p>
        <div class="map-container">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d59582.31596536299!2d105.834667!3d21.036897!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135aba15ec15d17%3A0x620e85c2cfe14d4c!2zTMSDbmcgQ2jhu6cgdOG7i2NoIEjhu5MgQ2jDrSBNaW5o!5e0!3m2!1svi!2sus!4v1729735752435!5m2!1svi!2sus"
            allowfullscreen=""
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          ></iframe>
          <button class="map-button" @click="openMapPopup = !openMapPopup">
            <svg class="map-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
              />
            </svg>
            Hiển thị trên bản đồ
          </button>
        </div>
      </div>
      <div class="form-button-container">
        <button type="button" class="previous" @click="$emit('previous')">Quay lại</button>
        <button type="button" class="next" @click="goNext" :disabled="!checkForNext">
          Tiếp tục
        </button>
      </div>
    </div>
  </form>
  <div id="map-container" class="leaflet-map-container" v-if="openMapPopup">
    <LMap style="height: 500px; width: 80%" :zoom="zoom" :center="center" @click="onMapClick">
      <LTileLayer :url="tileUrl" :attribution="tileAttribution" />
      <LMarker v-if="markerPosition" :lat-lng="markerPosition"></LMarker>
    </LMap>
    <i class="fa-solid fa-circle-xmark" style="font-size: 30px; margin-top: -25px; cursor: pointer;" @click="openMapPopup = false"></i>
  </div>
  <!--  form-2  -->
</template>
<style scoped>
.card {
  background-color: white;
  border: none;
  border-radius: 0.5rem;
  max-width: 500px;
  margin: 0 auto;
  animation: fade 250ms ease-in-out forwards;
  border-radius: 8px;
  padding: 35px;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.1);
  animation: slide 250ms 125ms ease-in-out both;
}

.next {
  background-color: #0358d7;
  color: white;
  border: none;
  padding-left: 70px;
  padding-right: 70px;
  padding-top: 10px;
  padding-bottom: 10px;
  border-radius: 8px;
  margin-top: 10px;
  cursor: pointer;
}

.next:hover {
  background-color: #003b95;
}

.next:disabled {
  background-color: #e0e0e0;
  cursor: not-allowed;
}

.previous {
  background-color: #0358d7;
  color: white;
  border: none;
  padding-left: 70px;
  padding-right: 70px;
  padding-top: 10px;
  padding-bottom: 10px;
  border-radius: 8px;
  margin-top: 10px;
  cursor: pointer;
}

.previous:hover {
  background-color: #003b95;
}

.previous:disabled {
  background-color: #e0e0e0;
  cursor: not-allowed;
}
.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 30px;
  gap: 0px;
}

.form-group:last-child {
  margin: 0;
}

.form-group > label {
  font-weight: bold;
  font-size: 0.8em;
  color: #333;
}

.form-group > input {
  border: 1px solid #333;
  border-radius: 0.25em;
  font-size: 1rem;
  padding: 0.25em;
}
.form-group:nth-child(3n) {
  display: flex;
  align-items: baseline;
}
.step-title {
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: bold;
}
.title {
  font-size: 28px;
  margin-bottom: 40px;
  font-weight: bold;
}
.sub-title {
  margin-top: 6px;
  font-size: 12px;
}
.divider {
  border: none;
  border-top: 1px solid #e7e7e7;
  margin: 0;
}
.card.active {
  animation: slide 250ms 125ms ease-in-out both;
}

.multi-step-form {
  overflow: hidden;
  position: relative;
  margin-top: 50px;
}

.hide {
  display: none;
}
.card .container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}
.form-button-container {
  display: flex;
  flex-direction: row;
  gap: 25px;
}
.form-group .zip {
  align-items: baseline;
}

label {
  display: block;
  font-weight: bold;
  margin-bottom: 5px;
}

select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
}

.radio-group {
  display: flex;
  align-items: center;
}

.radio-group input[type='radio'] {
  margin-right: 5px;
}

.radio-group label {
  margin-right: 10px;
  font-weight: normal;
}
.rating-form {
  font-family: Arial, sans-serif;
  max-width: 500px;
  padding: 20px;
}

.rating-form h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  font-weight: normal;
}

.rating-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rating-option {
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
}

.rating-option input[type='radio'] {
  opacity: 0;
  position: absolute;
}

.radio-custom {
  width: 18px;
  height: 18px;
  border: 2px solid #ccc;
  border-radius: 50%;
  margin-right: 10px;
  position: relative;
}

.rating-option input[type='radio']:checked + .radio-custom::after {
  content: '';
  width: 12px;
  height: 12px;
  background: #0066ff;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.rating-option input[type='radio']:checked + .radio-custom {
  border-color: #0066ff;
}

.label-text {
  margin-right: 10px;
  font-weight: lighter;
}

.stars {
  letter-spacing: 2px;
}

.rating-option input[type='radio']:focus + .radio-custom {
  box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.2);
}

.rating-option:hover .radio-custom {
  border-color: #0066ff;
}
.facilities-group {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 2px;
  margin-bottom: 24px;
}

.facility-item {
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
}

.facility-item input[type='checkbox'] {
  opacity: 0;
  position: absolute;
}

.checkbox-custom {
  width: 18px;
  height: 18px;
  border: 2px solid #ccc;
  border-radius: 4px;
  margin-right: 10px;
  position: relative;
}

.facility-item input[type='checkbox']:checked + .checkbox-custom::after {
  content: '';
  width: 10px;
  height: 10px;
  background: #0066ff;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 2px;
}

.facility-item input[type='checkbox']:checked + .checkbox-custom {
  border-color: #0066ff;
}

.facility-item:hover .checkbox-custom {
  border-color: #0066ff;
}

.facility-item input[type='checkbox']:focus + .checkbox-custom {
  box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.2);
}
.facilities-group span {
  font-weight: lighter;
}
.time-group {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.check-time > label {
  font-weight: bold;
  display: block;
}

.time-inputs {
  display: flex;
  gap: 20px;
}

.time-input {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.sub-label {
  display: block;
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 5px;
  order: -1; /* Đảm bảo label luôn ở trên */
}
.time-group label {
  font-size: 12px;
}
.time-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.radio-group {
  display: flex;
  gap: 24px;
}

.radio-option {
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
}

.radio-option input[type='radio'] {
  opacity: 0;
  position: absolute;
}

.radio-custom {
  width: 18px;
  height: 18px;
  border: 2px solid #ccc;
  border-radius: 50%;
  margin-right: 10px;
  position: relative;
}

.radio-option input[type='radio']:checked + .radio-custom::after {
  content: '';
  width: 12px;
  height: 12px;
  background: #0066ff;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.radio-option input[type='radio']:checked + .radio-custom {
  border-color: #0066ff;
}

.radio-option:hover .radio-custom {
  border-color: #0066ff;
}

.radio-option input[type='radio']:focus + .radio-custom {
  box-shadow: 0 0 0 2px rgba(0, 102, 255, 0.2);
}

.map-container {
  height: 200px;
  border-radius: 5px;
}

iframe {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 10px;
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

.leaflet-map-container {
    margin: 0 auto;
    top: 100px;
    position: absolute;
    width: 100vw;
    justify-content: center;
    display: flex;
    border-radius: 10px;
}


@keyframes slide {
  0% {
    transform: translateX(200%);
    opacity: 0;
  }
  100% {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fade {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(0.75);
    opacity: 0;
  }
  100% {
    opacity: 0;
    transform: scale(0);
  }
}
[data-next].disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: rgb(165, 165, 165);
  color: #4b4b4b;
}
</style>
