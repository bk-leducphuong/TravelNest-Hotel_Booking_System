<template>
  <el-dialog
    :model-value="true"
    :title="$t('map.title')"
    fullscreen
    class="hotel-map-dialog"
    @opened="onOpened"
    @close="closeMapPopup"
  >
    <div class="map-toolbar">
      <span>{{ searchSummary }}</span>
      <button v-if="canSearch" type="button" :disabled="loading" @click="searchArea">
        {{ $t(loading ? 'map.loading' : 'map.searchArea') }}
      </button>
      <span v-else>{{ $t('map.chooseDates') }}</span>
      <span v-if="areaSearched">{{ areaScopeLabel }}</span>
      <span v-if="locationChipLabel" class="map-location-chip">{{ locationChipLabel }}</span>
      <button
        v-if="hasUserLocation"
        type="button"
        :aria-pressed="showLocationOverlay"
        @click="showLocationOverlay = !showLocationOverlay"
      >
        {{
          showLocationOverlay
            ? $t('map.hideMyLocation')
            : $t('map.showMyLocation')
        }}
      </button>
    </div>
    <p v-if="error" role="alert" class="map-message">{{ error }}</p>
    <p v-if="hasMore" class="map-message">{{ $t('map.moreResults') }}</p>
    <div class="map-layout" :aria-busy="loading">
      <aside ref="hotelList" class="hotel-list" :aria-label="$t('map.title')">
        <p v-if="!displayHotels.length">{{ $t('map.empty') }}</p>
        <article
          v-for="hotel in displayHotels"
          :key="hotel.hotel_id"
          :ref="(el) => setCardRef(hotel.hotel_id, el)"
          class="hotel-card"
          :class="{
            selected: hotel.hotel_id === selectedHotelId,
            highlighted: hotel.hotel_id === highlightedHotelId,
          }"
          @mouseenter="onCardHover(hotel)"
          @mouseleave="hoveredHotelId = null"
        >
          <img
            v-if="getHotelImage(hotel)"
            :src="getHotelImage(hotel)"
            :alt="hotelName(hotel)"
            loading="lazy"
          />
          <div class="hotel-content">
            <button
              class="hotel-name"
              type="button"
              :aria-pressed="hotel.hotel_id === selectedHotelId"
              @click="selectHotel(hotel, true)"
            >
              {{ hotelName(hotel) }}
            </button>
            <p v-if="hotel.avg_rating != null">
              ★ {{ hotel.avg_rating }}
              <span v-if="hotel.review_count">({{ hotel.review_count }})</span>
            </p>
            <strong>{{ priceLabel(hotel) }}</strong>
            <p v-if="priceOf(hotel) != null">{{ $t('map.stayTotal') }}</p>
            <p>{{ $t('guest.finalQuote') }}</p>
            <div class="card-actions">
              <SavedHotelIcon
                :hotel-id="hotel.hotel_id"
                :initial-is-favorite="hotel.is_favorite ?? hotel.isFavorite ?? false"
                :use-initial-favorite-status="true"
              />
              <button type="button" @click="openHotel(hotel)">{{ $t('map.viewProperty') }}</button>
              <a
                v-if="directionsUrl(hotel)"
                class="card-directions"
                :href="directionsUrl(hotel)"
                target="_blank"
                rel="noopener noreferrer"
                :title="$t('directions.newTabHint')"
                @click="trackDirections(hotel)"
              >
                {{ $t('map.getDirections') }}
              </a>
            </div>
          </div>
        </article>
      </aside>
      <div class="map-container">
        <LMap
          ref="map"
          :zoom="13"
          :center="initialCenter"
          :use-global-leaflet="false"
          @ready="onMapReady"
          @moveend="onMoveEnd"
        >
          <LTileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
          />
          <LCircle
            v-if="showApproximateArea"
            v-bind="approximateAreaStyle"
            :lat-lng="approximateAreaCenter"
            :radius="approximateAreaMeters"
          />
          <LCircle
            v-if="showSearchRadius"
            v-bind="searchRadiusStyle"
            :lat-lng="searchRadiusCenter"
            :radius="searchRadiusMeters"
          />
          <LMarker
            v-if="showUserMarker"
            :lat-lng="anchorLatLng"
            :icon="userLocationIcon"
            :z-index-offset="2000"
            :options="{
              title: $t('map.yourLocation'),
              alt: $t('map.yourLocation'),
              keyboard: true,
            }"
          >
            <LTooltip>{{ $t('map.yourLocation') }}</LTooltip>
          </LMarker>
          <LMarker
            v-for="hotel in mappableHotels"
            :key="hotel.hotel_id"
            :lat-lng="latLng(hotel)"
            :icon="priceIcon(hotel)"
            :z-index-offset="hotel.hotel_id === highlightedHotelId ? 1000 : 0"
            :options="{ title: hotelName(hotel), alt: hotelName(hotel), keyboard: true }"
            @ready="onMarkerReady(hotel.hotel_id)"
            @click="selectHotel(hotel)"
            @mouseover="onMarkerHover(hotel)"
            @mouseout="hoveredHotelId = null"
          />
        </LMap>
        <p v-if="!mappableHotels.length && !loading" class="map-notice">
          {{ $t('map.noLocation') }}
        </p>
        <p v-if="areaChanged" class="map-notice">{{ $t('map.areaChanged') }}</p>
      </div>
    </div>
  </el-dialog>
</template>

<script>
  import { LCircle, LMap, LTileLayer, LMarker, LTooltip } from '@vue-leaflet/vue-leaflet';
  import * as L from 'leaflet/dist/leaflet-src.esm';
  import 'leaflet/dist/leaflet.css';
  import SavedHotelIcon from '@/components/SavedHotelIcon.vue';
  import { getFirstImageUrl, getImageUrl } from '@/utils/images';
  import { guestMoney } from '@/utils/guestPresentation';
  import { formatDistance } from '@/utils/distance';
  import { getDirectionsUrl, directionsModeForDistance } from '@/utils/directions';
  import { SearchService } from '@/services/search.service';
  import { AnalyticsService } from '@/services/analytics.service';

  export default {
    components: { LCircle, LMap, LTileLayer, LMarker, LTooltip, SavedHotelIcon },
    props: {
      hotels: { type: Array, required: true },
      searchParams: { type: Object, default: () => ({}) },
      initialSelectedHotelId: { type: String, default: null },
    },
    data() {
      return {
        results: null,
        selectedHotelId: this.initialSelectedHotelId || this.hotels[0]?.hotel_id || null,
        hoveredHotelId: null,
        loading: false,
        error: null,
        hasMore: false,
        areaChanged: false,
        areaSearched: false,
        ready: false,
        readyMarkerIds: new Set(),
        initialSearchStarted: false,
        requestVersion: 0,
        cardRefs: {},
        controller: null,
        resizeObserver: null,
        searchedBounds: null,
        radiusCenter: null,
        showLocationOverlay: true,
      };
    },
    computed: {
      highlightedHotelId() {
        return this.hoveredHotelId ?? this.selectedHotelId;
      },
      displayHotels() {
        return this.results ?? this.hotels;
      },
      mappableHotels() {
        return this.displayHotels.filter(this.hasCoords);
      },
      anchorLatLng() {
        const latitude = Number(this.searchParams.latitude);
        const longitude = Number(this.searchParams.longitude);
        return Number.isFinite(latitude) && Number.isFinite(longitude)
          ? [latitude, longitude]
          : null;
      },
      initialCenter() {
        if (this.anchorLatLng) return this.anchorLatLng;
        const hotel = this.hotels.find(this.hasCoords);
        return hotel ? this.latLng(hotel) : [10.7769, 106.7009];
      },
      directionsOrigin() {
        // Only a precise browser fix is safe to use as a route origin; IP
        // coordinates can be city-level and would produce misleading routes.
        if (this.searchParams.locationSource !== 'gps') return null;
        const latitude = Number(this.searchParams.latitude);
        const longitude = Number(this.searchParams.longitude);
        return Number.isFinite(latitude) && Number.isFinite(longitude)
          ? { latitude, longitude }
          : null;
      },
      areaScopeLabel() {
        const radius = Number(this.criteria.radius);
        if (Number.isFinite(radius) && radius > 0) {
          return this.$t('map.radiusScope', {
            distance: formatDistance(radius, this.$i18n?.locale || 'en'),
          });
        }
        return this.$t('map.areaScope');
      },
      locationSource() {
        const source = this.searchParams.locationSource;
        return source === 'gps' || source === 'ip' ? source : null;
      },
      hasUserLocation() {
        return Boolean(this.locationSource && this.anchorLatLng);
      },
      isPreciseLocation() {
        return this.locationSource === 'gps' && Boolean(this.anchorLatLng);
      },
      isApproximateLocation() {
        return this.locationSource === 'ip';
      },
      showUserMarker() {
        return this.showLocationOverlay && this.isPreciseLocation;
      },
      searchRadiusKm() {
        const radius = Number(this.criteria.radius);
        return Number.isFinite(radius) && radius > 0 ? radius : null;
      },
      searchRadiusMeters() {
        return this.searchRadiusKm ? this.searchRadiusKm * 1000 : 0;
      },
      searchRadiusCenter() {
        return this.radiusCenter || this.anchorLatLng;
      },
      showSearchRadius() {
        return Boolean(
          this.showLocationOverlay && this.searchRadiusKm && this.searchRadiusCenter
        );
      },
      showApproximateArea() {
        return Boolean(
          this.showLocationOverlay &&
            this.isApproximateLocation &&
            this.anchorLatLng &&
            !this.searchRadiusKm
        );
      },
      approximateAreaCenter() {
        return this.anchorLatLng;
      },
      approximateAreaMeters() {
        return 5000;
      },
      locationChipLabel() {
        if (this.locationSource === 'gps') return this.$t('map.yourLocation');
        if (this.locationSource === 'ip') return this.$t('map.approximateLocation');
        return '';
      },
      userLocationIcon() {
        return L.divIcon({
          html: '<span class="user-location-dot" aria-hidden="true"></span>',
          className: 'user-location-marker',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
      },
      searchRadiusStyle() {
        return {
          color: '#006ce4',
          weight: 1,
          opacity: 0.7,
          fillColor: '#006ce4',
          fillOpacity: 0.06,
        };
      },
      approximateAreaStyle() {
        return {
          color: '#6b7280',
          weight: 1,
          dashArray: '6 6',
          opacity: 0.7,
          fillColor: '#6b7280',
          fillOpacity: 0.04,
        };
      },
      criteria() {
        const stay = this.$store.getters['search/getSearchData'] || {};
        return {
          checkIn: stay.checkInDate,
          checkOut: stay.checkOutDate,
          adults: Number(stay.adults) || 2,
          children: Number(stay.children) || 0,
          rooms: Number(stay.rooms) || 1,
          ...this.searchParams,
        };
      },
      canSearch() {
        return Boolean(this.criteria.checkIn && this.criteria.checkOut);
      },
      searchSummary() {
        if (!this.canSearch) return this.$t('map.title');
        const guests = Number(this.criteria.adults) + Number(this.criteria.children || 0);
        const rooms = Number(this.criteria.rooms) || 1;
        const party = this.$t('map.party', {
          guests: this.$t('map.guestCount', { count: guests }, guests),
          rooms: this.$t('map.roomCount', { count: rooms }, rooms),
        });
        return `${this.criteria.checkIn} → ${this.criteria.checkOut} · ${party}`;
      },
    },
    watch: {
      criteria: {
        deep: true,
        handler() {
          this.requestVersion++;
          this.controller?.abort();
          this.loading = false;
          this.results = null;
          this.areaSearched = false;
          this.areaChanged = true;
          this.error = null;
          this.hasMore = false;
        },
      },
    },
    beforeUnmount() {
      this.requestVersion++;
      this.controller?.abort();
      this.resizeObserver?.disconnect();
    },
    methods: {
      hotelName(hotel) {
        return hotel.hotel_name || hotel.name || '';
      },
      hasCoords(hotel) {
        return (
          [hotel.latitude, hotel.longitude].every(
            (v) =>
              v !== null && v !== undefined && String(v).trim() !== '' && Number.isFinite(Number(v))
          ) &&
          Math.abs(Number(hotel.latitude)) <= 90 &&
          Math.abs(Number(hotel.longitude)) <= 180
        );
      },
      latLng(hotel) {
        return [Number(hotel.latitude), Number(hotel.longitude)];
      },
      directionsMode(hotel) {
        return directionsModeForDistance(hotel.distance_km);
      },
      directionsUrl(hotel) {
        return getDirectionsUrl({
          latitude: hotel.latitude,
          longitude: hotel.longitude,
          origin: this.directionsOrigin,
          mode: this.directionsMode(hotel),
        });
      },
      trackDirections(hotel) {
        const source = this.searchParams.locationSource;
        AnalyticsService.trackDirectionsClick({
          hotelId: hotel.hotel_id,
          mode: this.directionsMode(hotel),
          source: source === 'gps' || source === 'ip' ? source : 'none',
        }).catch(() => {});
      },
      priceOf(hotel) {
        const value = hotel.min_price_for_requested_rooms ?? hotel.min_price_for_dates;
        return value !== null &&
          value !== undefined &&
          value !== '' &&
          Number.isFinite(Number(value))
          ? Number(value) *
              (hotel.min_price_for_requested_rooms == null ? Number(this.criteria.rooms) || 1 : 1)
          : null;
      },
      priceLabel(hotel) {
        return this.priceOf(hotel) == null
          ? this.$t('map.priceUnavailable')
          : guestMoney(this.priceOf(hotel), hotel.currency || 'USD', this.$i18n.locale);
      },
      priceIcon(hotel) {
        const element = document.createElement('span');
        element.textContent = this.priceLabel(hotel);
        const active = hotel.hotel_id === this.highlightedHotelId;
        return L.divIcon({
          html: element,
          className: `hotel-price-marker${active ? ' active' : ''}`,
          iconSize: null,
          iconAnchor: [35, 15],
        });
      },
      getHotelImage(hotel) {
        return hotel.primary_image_url
          ? getImageUrl(hotel.primary_image_url)
          : getFirstImageUrl(hotel.image_urls);
      },
      setCardRef(id, element) {
        if (element) this.cardRefs[id] = element;
        else delete this.cardRefs[id];
      },
      revealMarker(hotel) {
        const map = this.$refs.map?.leafletObject;
        if (!map || !this.hasCoords(hotel)) return;
        // Leave room for the marker label and the mobile hotel card.
        const bottomPadding =
          window.innerWidth <= 700 ? (this.$refs.hotelList?.clientHeight || 0) + 48 : 48;
        map.panInside(this.latLng(hotel), {
          paddingTopLeft: [80, 48],
          paddingBottomRight: [120, bottomPadding],
          animate: true,
        });
      },
      revealCard(hotel) {
        const list = this.$refs.hotelList;
        const card = this.cardRefs[hotel.hotel_id];
        if (!list || !card) return;
        const listBounds = list.getBoundingClientRect();
        const cardBounds = card.getBoundingClientRect();
        if (!cardBounds.height) return;
        let offset = 0;
        if (cardBounds.top < listBounds.top) offset = cardBounds.top - listBounds.top;
        else if (cardBounds.bottom > listBounds.bottom) {
          offset =
            cardBounds.height > listBounds.height
              ? cardBounds.top - listBounds.top
              : cardBounds.bottom - listBounds.bottom;
        }
        if (offset) list.scrollTo({ top: list.scrollTop + offset, behavior: 'smooth' });
      },
      onCardHover(hotel) {
        this.hoveredHotelId = hotel.hotel_id;
        this.revealMarker(hotel);
      },
      onMarkerHover(hotel) {
        this.hoveredHotelId = hotel.hotel_id;
        this.revealCard(hotel);
      },
      selectHotel(hotel, pan = false) {
        this.selectedHotelId = hotel.hotel_id;
        this.$nextTick(() => {
          this.revealCard(hotel);
          if (pan) this.revealMarker(hotel);
        });
      },
      openHotel(hotel) {
        this.$router.push({
          name: 'HotelDetails',
          params: { hotel_id: hotel.hotel_id },
          query: {
            checkInDate: this.criteria.checkIn,
            checkOutDate: this.criteria.checkOut,
            adults: this.criteria.adults,
            children: this.criteria.children,
            rooms: this.criteria.rooms,
          },
        });
        this.closeMapPopup();
      },
      closeMapPopup() {
        this.requestVersion++;
        this.controller?.abort();
        this.$emit('close-map-popup');
      },
      onOpened() {
        this.$refs.map?.leafletObject?.invalidateSize();
      },
      onMapReady() {
        const map = this.$refs.map?.leafletObject;
        if (!map) return;
        map.invalidateSize();
        const points = this.hotels.filter(this.hasCoords).map(this.latLng);
        // A location-aware search anchors on the guest's coordinates; otherwise
        // frame the hotels returned by the current search.
        if (this.anchorLatLng) map.setView(this.anchorLatLng, 13);
        else if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
        else if (points.length) map.setView(points[0], 14);
        this.ready = true;
        this.resizeObserver = new ResizeObserver(() => map.invalidateSize({ pan: false }));
        this.resizeObserver.observe(map.getContainer());
        this.searchInitialArea();
      },
      onMarkerReady(id) {
        this.readyMarkerIds.add(id);
        this.searchInitialArea();
      },
      searchInitialArea() {
        // Vue Leaflet mounts markers asynchronously. Replacing results before
        // they are ready can unmount layers whose Leaflet objects do not exist yet.
        if (
          !this.ready ||
          this.initialSearchStarted ||
          !this.mappableHotels.every((hotel) => this.readyMarkerIds.has(hotel.hotel_id))
        )
          return;
        this.initialSearchStarted = true;
        if (this.canSearch) this.searchArea();
      },
      currentBounds() {
        const bounds = this.$refs.map?.leafletObject?.getBounds();
        if (!bounds) return null;
        const width = bounds.getEast() - bounds.getWest();
        const wrap = (v) => ((((v + 180) % 360) + 360) % 360) - 180;
        return {
          north: Math.min(90, bounds.getNorth()),
          south: Math.max(-90, bounds.getSouth()),
          east: width >= 360 ? 180 : wrap(bounds.getEast()),
          west: width >= 360 ? -180 : wrap(bounds.getWest()),
        };
      },
      onMoveEnd() {
        if (this.ready)
          this.areaChanged = JSON.stringify(this.currentBounds()) !== this.searchedBounds;
      },
      async searchArea() {
        if (!this.canSearch) return;

        const map = this.$refs.map?.leafletObject;
        const bounds = this.currentBounds();
        const center = map?.getCenter();
        const radiusKm = Number(this.criteria.radius);
        const useRadius = Boolean(center) && Number.isFinite(radiusKm) && radiusKm > 0;

        if (!useRadius) {
          if (!bounds) return;
          const width = (bounds.east - bounds.west + 360) % 360;
          if (!width || width > 2 || bounds.north - bounds.south > 2) {
            this.error = this.$t('map.zoomIn');
            return;
          }
        }

        const version = ++this.requestVersion;
        this.controller?.abort();
        this.controller = new AbortController();
        this.loading = true;
        this.error = null;
        // A selected distance band searches around the map center; otherwise
        // fall back to the visible viewport.
        const params = useRadius
          ? { latitude: center.lat, longitude: center.lng, radius: radiusKm }
          : { ...bounds };
        for (const key of [
          'checkIn',
          'checkOut',
          'adults',
          'children',
          'rooms',
          'minPrice',
          'maxPrice',
          'minRating',
          'hotelClass',
          'amenities',
          'freeCancellation',
          'sortBy',
        ]) {
          if (this.criteria[key] != null) params[key] = this.criteria[key];
        }
        try {
          const response = await SearchService.searchMapHotels(params, this.controller.signal);
          if (version !== this.requestVersion) return;
          const data = response.data ?? response;
          this.results = data.hotels;
          this.hasMore = data.hasMore;
          if (useRadius) this.radiusCenter = [center.lat, center.lng];
          this.searchedBounds = bounds ? JSON.stringify(bounds) : null;
          this.areaSearched = true;
          this.onMoveEnd();
          if (!this.results.some((h) => h.hotel_id === this.selectedHotelId))
            this.selectedHotelId = this.results[0]?.hotel_id ?? null;
        } catch (error) {
          if (version !== this.requestVersion) return;
          this.error = this.$t(
            error.response?.status === 400 ? 'map.zoomOrDates' : 'map.loadError'
          );
        } finally {
          if (version === this.requestVersion) this.loading = false;
        }
      },
    },
  };
</script>

<style scoped>
  .map-toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    padding: 0 0 12px;
  }
  .map-toolbar button,
  .card-actions button {
    border: 0;
    border-radius: 8px;
    padding: 10px 16px;
    background: #006ce4;
    color: white;
    cursor: pointer;
  }
  .map-toolbar button:disabled {
    opacity: 0.6;
    cursor: wait;
  }
  .map-location-chip {
    padding: 4px 10px;
    border-radius: 999px;
    background: #e8f1fc;
    color: #006ce4;
    font-size: 12px;
    font-weight: 600;
  }
  .map-layout {
    display: flex;
    flex: 1;
    min-height: 0;
  }
  .hotel-list {
    width: 340px;
    flex-shrink: 0;
    overflow-y: auto;
    padding: 8px 16px 8px 0;
  }
  .hotel-card {
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 12px;
  }
  .hotel-card.highlighted {
    border-color: #006ce4;
  }
  .hotel-card img {
    width: 100%;
    height: 140px;
    object-fit: cover;
  }
  .hotel-content {
    padding: 12px;
  }
  .hotel-content p {
    font-size: 12px;
    margin: 6px 0;
  }
  .hotel-name {
    background: none;
    border: 0;
    text-align: left;
    font: inherit;
    font-weight: 700;
    color: #006ce4;
    cursor: pointer;
  }
  .card-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 10px;
  }
  .card-actions .card-directions {
    color: #006ce4;
    font-size: 12px;
    font-weight: 600;
    text-decoration: underline;
  }
  .card-actions :deep(.favorite-button) {
    position: static;
    flex-shrink: 0;
    padding: 0;
    background: white;
    color: #1f2937;
  }
  .map-container {
    flex: 1;
    min-width: 0;
    position: relative;
  }
  .map-notice {
    position: absolute;
    z-index: 500;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    padding: 8px 16px;
    border-radius: 8px;
  }
  .map-message {
    margin: 4px 0 8px;
    color: #8c3b00;
  }
  @media (max-width: 700px) {
    .map-layout {
      position: relative;
    }
    .hotel-list {
      position: absolute;
      bottom: 24px;
      left: 8px;
      right: 8px;
      width: auto;
      padding: 0;
      z-index: 600;
      max-height: 210px;
    }
    .hotel-card {
      display: none;
      background: white;
    }
    .hotel-card.selected {
      display: flex;
    }
    .hotel-card img {
      width: 95px;
      height: auto;
      object-fit: cover;
    }
    .hotel-content {
      flex: 1;
    }
    .map-notice {
      top: 8px;
      bottom: auto;
      width: max-content;
      max-width: 85%;
    }
  }
</style>
<style>
  .hotel-price-marker {
    width: max-content !important;
    height: auto !important;
    background: #003b80;
    color: white;
    border: 2px solid white;
    border-radius: 16px;
    padding: 5px 10px;
    font-weight: 700;
    white-space: nowrap;
    box-shadow: 0 2px 5px #0003;
  }
  .hotel-price-marker.active {
    background: #fff;
    color: #003b80;
    border-color: #006ce4;
  }
  .hotel-price-marker:focus-visible {
    outline: 3px solid #ffb700;
  }
  .hotel-map-dialog .el-dialog__body {
    padding-top: 8px;
  }
</style>

<style>
  .hotel-map-dialog.el-dialog.is-fullscreen {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: none;
    height: 100dvh;
    margin: 0;
    border-radius: 0;
  }
  .hotel-map-dialog .el-dialog__body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .hotel-map-dialog .leaflet-control-zoom a {
    background: white;
    color: #223;
  }
</style>

<style>
  /* Leaflet markers are created outside the scoped-style tree. */
  .user-location-marker {
    background: transparent;
    border: 0;
  }
  .user-location-dot {
    display: block;
    width: 18px;
    height: 18px;
    margin: 2px;
    border: 3px solid #fff;
    border-radius: 50%;
    background: #006ce4;
    box-shadow: 0 0 0 5px rgba(0, 108, 228, 0.25);
  }
</style>
