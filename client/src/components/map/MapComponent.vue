<template>
  <el-dialog :model-value="true" :title="$t('map.title')" width="1200px" @close="closeMapPopup">
    <div class="popup-container">
      <aside class="hotel-list">
        <div class="hotel-list-header">
          <h2>{{ $t('map.title') }}</h2>
        </div>

        <p v-if="hotels.length === 0" class="hotel-list-empty">{{ $t('map.empty') }}</p>

        <div
          v-for="hotel in hotels"
          :key="hotel.hotel_id"
          class="hotel-card"
          @mouseover="hoveredHotelId = hotel.hotel_id"
          @mouseleave="hoveredHotelId = null"
        >
          <div class="hotel-image">
            <img v-if="getHotelImage(hotel)" :src="getHotelImage(hotel)" :alt="hotelName(hotel)" />
            <div v-else class="hotel-image-fallback" aria-hidden="true">
              <i class="fa-regular fa-image"></i>
            </div>
            <SavedHotelIcon
              :hotel-id="hotel.hotel_id"
              :initial-is-favorite="hotel.is_favorite ?? hotel.isFavorite ?? false"
              :use-initial-favorite-status="true"
            />
          </div>
          <div class="hotel-content">
            <div v-if="starCount(hotel) > 0" class="rating-row">
              <div class="rating-stars" :aria-label="$t('map.stars', { count: starCount(hotel) })">
                <span
                  v-for="n in 5"
                  :key="n"
                  class="star"
                  :class="{ 'star--off': n > starCount(hotel) }"
                  >★</span
                >
              </div>
            </div>

            <h3 class="hotel-name"><button type="button" class="map-hotel-link" @click="openHotel(hotel)">{{ hotelName(hotel) }}</button></h3>

            <div v-if="hotel.avg_rating != null || hotel.review_count" class="rating-score">
              <span v-if="hotel.avg_rating != null" class="score">{{ hotel.avg_rating }}</span>
              <span v-if="hotel.review_count" class="review-count">{{
                $t('map.reviewCount', { count: hotel.review_count })
              }}</span>
            </div>

            <div v-if="priceOf(hotel) != null" class="price-section">
              <span class="current-price">USD {{ priceOf(hotel).toLocaleString('en-US') }}</span>
              <span class="price-info">{{ $t('guest.finalQuote') }}</span>
            </div>
          </div>
        </div>
      </aside>

      <div class="map-container">
        <p v-if="mappableHotels.length === 0" class="map-empty">{{ $t('map.noLocation') }}</p>
        <LMap
          v-else
          ref="map"
          :zoom="zoom"
          :center="center"
          :use-global-leaflet="false"
          class="leaflet-map"
        >
          <LTileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            layer-type="base"
            name="OpenStreetMap"
          ></LTileLayer>
          <LMarker
            v-for="hotel in mappableHotels"
            :key="hotel.hotel_id"
            :lat-lng="latLng(hotel)"
            :icon="hotel.hotel_id === hoveredHotelId ? redIcon : blueIcon"
            >
            <LPopup>{{ hotelName(hotel) }}</LPopup>
          </LMarker>
        </LMap>
      </div>
    </div>
  </el-dialog>
</template>

<script>
import SavedHotelIcon from '@/components/SavedHotelIcon.vue'
import { getFirstImageUrl, getImageUrl } from '@/utils/images'
import 'leaflet/dist/leaflet.css'
// load marker icons
import blueMarkerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadowIcon from 'leaflet/dist/images/marker-shadow.png'
import redMarkerIcon from '@/assets/marker/red-marker-icon.png'

import { LMap, LTileLayer, LMarker, LPopup } from '@vue-leaflet/vue-leaflet'

import * as L from 'leaflet'

// Define icons for default and hovered markers
const blueIcon = L.icon({
  iconUrl: blueMarkerIcon,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: markerShadowIcon,
})

const redIcon = L.icon({
  iconUrl: redMarkerIcon,
  iconSize: [35, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: markerShadowIcon,
})

export default {
  components: {
    LMap,
    LTileLayer,
    LMarker,
    LPopup,
    SavedHotelIcon,
  },
  props: {
    hotels: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      center: [15.9030623, 105.8066925],
      zoom: 4,
      hoveredHotelId: null,
      blueIcon,
      redIcon,
    }
  },
  computed: {
    // Only hotels with real coordinates can be placed on the map.
    mappableHotels() {
      return (this.hotels || []).filter((hotel) => this.hasCoords(hotel))
    },
  },
  watch: {
    mappableHotels() {
      this.$nextTick(() => this.fitMapToHotels())
    },
  },
  mounted() {
    this.$nextTick(() => this.fitMapToHotels())
  },
  methods: {
    hotelName(hotel) {
      return hotel.hotel_name || hotel.name || ''
    },
    hasCoords(hotel) {
      if (hotel.latitude == null || hotel.longitude == null) return false
      const lat = Number(hotel.latitude)
      const lng = Number(hotel.longitude)
      return Number.isFinite(lat) && Number.isFinite(lng)
    },
    latLng(hotel) {
      return [Number(hotel.latitude), Number(hotel.longitude)]
    },
    starCount(hotel) {
      return Math.max(0, Math.min(5, parseInt(hotel.hotel_class, 10) || 0))
    },
    priceOf(hotel) {
      const price = hotel.min_price_for_dates ?? hotel.lowestPrice
      return price == null ? null : price
    },
    getHotelImage(hotel) {
      if (hotel.primary_image_url) return getImageUrl(hotel.primary_image_url)
      return getFirstImageUrl(hotel.image_urls)
    },
    openHotel(hotel) {
      if (!hotel?.hotel_id) return
      this.$router.push({ name: 'HotelDetails', params: { hotel_id: hotel.hotel_id } })
    },
    closeMapPopup() {
      this.$emit('close-map-popup')
    },
    // Fit the viewport to the result markers instead of a hardcoded centre.
    fitMapToHotels() {
      const map = this.$refs.map?.leafletObject
      const points = this.mappableHotels.map((hotel) => this.latLng(hotel))
      if (!map || points.length === 0) return

      if (points.length === 1) {
        map.setView(points[0], 13)
        return
      }

      map.fitBounds(L.latLngBounds(points), { padding: [30, 30] })
    },
  },
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
  position: relative;
  background: white;
  border-radius: 8px;
  width: min(1200px, 94vw);
  height: min(80vh, 720px);
  display: flex;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
}

.hotel-list {
  width: 40%;
  max-width: 420px;
  padding: 20px;
  overflow-y: auto;
  border-right: 1px solid #eee;
}

.hotel-list-header {
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
  margin-bottom: 16px;
}

.hotel-list-empty,
.map-empty {
  color: #666;
}

.map-container {
  flex: 1;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.leaflet-map {
  height: 100%;
  width: 100%;
}

.close-button {
  position: absolute;
  z-index: 999;
  top: 12px;
  right: 12px;
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
  font-family: inherit;
}

.hotel-card:hover {
  border-color: #0066cc;
}

.hotel-image {
  position: relative;
  width: 100%;
  height: 200px;
}

.hotel-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hotel-image-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f2f2f2;
  color: #9aa0a6;
  font-size: 28px;
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
  font-size: 18px;
}

.star--off {
  color: #d9d9d9;
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

.review-count {
  color: #666;
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

@media (max-width: 768px) {
  .popup-container {
    flex-direction: column;
    width: 96vw;
    height: 92vh;
  }

  .hotel-list {
    width: 100%;
    max-width: none;
    height: 45%;
    border-right: none;
    border-bottom: 1px solid #eee;
  }

  .map-container {
    height: 55%;
  }
}
</style>

<style scoped>
.popup-container { position:relative; width:100%; height:65vh; max-height:700px; border-radius:0; box-shadow:none; }
.map-hotel-link { background:none; border:0; padding:0; text-align:left; font:inherit; color:var(--tn-brand); cursor:pointer; }
@media(max-width:767px) { .popup-container { display:flex; flex-direction:column-reverse; height:70vh; } .hotel-list { width:100%; max-height:45%; flex-shrink:0; } .map-container { width:100%; min-height:220px; flex:1; } }
</style>
