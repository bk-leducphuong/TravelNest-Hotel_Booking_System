<template>
  <div class="popup-overlay">
    <button class="close-button" @click="closeMapPopup">✕</button>
    <div class="popup-container">
      <div class="hotel-list">
        <div class="hotel-list-header">
          <h2>Hotels</h2>
        </div>

        <!-- Hotel cards -->
        <div class="hotel-card" v-for="hotel in hotels" :key="hotel.hotel_id"   @mouseover="hoveredHotelId = hotel.hotel_id"
          @mouseleave="hoveredHotelId = null">
          <div class="hotel-image">
            <img :src="JSON.parse(hotel.image_urls)[0]" alt="hotel-image" />
            <SavedHotelIcon :hotelId="hotel.hotel_id" />
          </div>
          <div class="hotel-content">
            <div class="rating-row">
              <div class="rating-stars">
                <span class="star">★</span>
                <span class="star">★</span>
                <span class="star">★</span>
                <span class="star">★</span>
              </div>
              <span class="genius-badge">Genius</span>
            </div>

            <h2 class="hotel-name">{{ hotel.name }}</h2>

            <div class="rating-score">
              <span class="score">{{hotel.overall_rating}}</span>
              <span class="rating-text">Rất tốt</span>
              <span class="review-count">• 166 đánh giá</span>
            </div>

            <div class="room-details">
              1 studio nguyên căn: 1 giường • 1 phòng tắm • 20m²<br>
              8 đêm, 2 người lớn
            </div>

            <div class="price-section" v-if="hotel.lowestPrice">
              <span class="current-price">VND {{ parseInt(hotel.lowestPrice).toLocaleString('vi-VN') }}</span>
              <span class="price-info">Đã bao gồm thuế và phí</span>
            </div>
          </div>
        </div>
      </div>

      <div class="map-container">
        <div class="map-placeholder">
          <div style="height: 480px; width: 800px">
            <LMap ref="map" v-model:zoom="zoom" :center="center" :use-global-leaflet="false">
              <LTileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" layer-type="base"
                name="OpenStreetMap"></LTileLayer>
              <LMarker v-for="hotel in hotels" :key="hotel.hotel_id" :lat-lng="[hotel.latitude, hotel.longitude]" :icon="hotel.hotel_id === hoveredHotelId ? redIcon : blueIcon">
                <LPopup>{{ hotel.name }}</LPopup>
              </LMarker>
            </LMap>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SavedHotelIcon from '@/components/SavedHotelIcon.vue'
import 'leaflet/dist/leaflet.css'
// load marker icons
import blueMarkerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadowIcon from "leaflet/dist/images/marker-shadow.png";
import redMarkerIcon from "@/assets/marker/red-marker-icon.png";

import { LMap, LTileLayer, LMarker, LPopup } from '@vue-leaflet/vue-leaflet'

import * as L from 'leaflet'

// Define icons for default and hovered markers
const blueIcon = L.icon({
  iconUrl: blueMarkerIcon,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: markerShadowIcon,
});

const redIcon = L.icon({
  iconUrl: redMarkerIcon,
  iconSize: [35, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: markerShadowIcon,
});


export default {
  components: {
    LMap,
    LTileLayer,
    LMarker,
    LPopup,
    SavedHotelIcon
  },
  data() {
    return {
      openMapPopup: true,
      center: [15.9030623, 105.8066925],
      zoom: 4,
      hoveredHotelId: null, // Track which hotel is hovered
      blueIcon,
      redIcon
    }
  },
  props: {
    hotels: {
      type: Array,
      required: true
    }
  },
  methods: {
    closeMapPopup() {
      this.$emit('close-map-popup');
    }
  },
  mounted() {
    console.log(this.hotels)
  }
}
</script>

<style scoped>
/* Map popup */
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
}

.popup-container {
  background: white;
  border-radius: 8px;
  width: 90%;
  height: 80vh;
  max-width: 1200px;
  display: flex;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
}

.hotel-list {
  width: 40%;
  padding: 20px;
  overflow-y: auto;
  border-right: 1px solid #eee;
}

.hotel-list-header {
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
  margin-bottom: 16px;
}

.map-container {
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-placeholder {
  color: #666;
  text-align: center;
}

.close-button {
  z-index: 999;
  position: absolute;
  top: 50px;
  right: 50px;
  background: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  background: #f5f5f5;
}

/* Hotel card */
.hotel-card {
  margin-bottom: 10px;
  cursor: pointer;
  border-radius: 8px;
  border: 1px solid #eee;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
}

.hotel-card:hover {
  border-color: #0066cc;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.hotel-image {
  position: relative;
  width: 100%;
  height: 200px;
  background-image: url('https://cf.bstatic.com/xdata/images/hotel/square600/584426827.webp?k=bb9814a06488db8b686ac44963015b0f0a861f5536304a689fc2d00ed60a1679&o=');
  background-size: cover;
  background-position: center;
}

.hotel-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.favorite-button {
  position: absolute;
  top: 16px;
  right: 16px;
  background: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.hotel-content {
  padding: 16px;
  background: #fff;
}

.rating-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.rating-stars {
  display: flex;
  gap: 2px;
}

.star {
  color: #febb02;
  font-size: 20px;
}

.genius-badge {
  background: #003580;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
}

.hotel-name {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 12px;
}

.rating-score {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 3px;
}

.score {
  background: #003580;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
}

.rating-text {
  color: #333;
}

.review-count {
  color: #666;
}


.room-details {
  margin-bottom: 12px;
  color: #333;
}

.price-section {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}


.current-price {
  font-size: 20px;
  font-weight: bold;
  color: #000;
}

.price-info {
  color: #666;
  font-size: 14px;
}
</style>
