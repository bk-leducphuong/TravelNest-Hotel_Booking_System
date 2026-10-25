<script>
  import { mapActions, mapGetters } from 'vuex';
  import GuestHotelCard from './GuestHotelCard.vue';
  import SkeletonGrid from '@/components/common/SkeletonGrid.vue';
  import { HotelService } from '@/services/hotel.service';
  import errorHandler from '@/request/errorHandler.js';

  export default {
    name: 'ViewedHotels',
    components: {
      GuestHotelCard,
      SkeletonGrid,
    },
    data() {
      return {
        viewedHotels: [],
        isLoading: false,
        loadError: false,
      };
    },
    computed: {
      ...mapGetters('auth', ['isUserAuthenticated']),
    },
    mounted() {
      this.loadViewedHotels();
    },
    methods: {
      ...mapActions('search', ['updateLocation']),
      redirectToHotelDetails(hotel) {
        const hotelId = hotel.id;
        const cityName = hotel.city?.name ?? hotel.city ?? '';
        if (cityName) this.updateLocation(cityName);

        // Keep localStorage in sync for consistency (view is recorded by GET hotel details)
        const viewedHotels = localStorage.getItem('viewedHotels')
          ? JSON.parse(localStorage.getItem('viewedHotels'))
          : [];
        const index = viewedHotels.findIndex((id) => id === hotelId);
        if (index !== -1) viewedHotels.splice(index, 1);
        viewedHotels.push(hotelId);
        localStorage.setItem('viewedHotels', JSON.stringify(viewedHotels));

        this.$router.push({ name: 'HotelDetails', params: { hotel_id: hotelId } });
      },
      async loadViewedHotels() {
        try {
          this.isLoading = true;
          this.loadError = false;

          if (!this.isUserAuthenticated) {
            const raw = localStorage.getItem('viewedHotels');
            const ids = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(ids) || ids.length === 0) {
              this.viewedHotels = [];
              return;
            }

            const response = await HotelService.getHotelsByIds(ids);
            const list = response?.data ?? response ?? [];
            this.viewedHotels = Array.isArray(list) ? list : [];
            return;
          }

          const response = await HotelService.getRecentlyViewed(10);
          const list = response?.data ?? response ?? [];
          this.viewedHotels = Array.isArray(list) ? list : [];
        } catch (error) {
          errorHandler(error);
          this.loadError = true;
          this.viewedHotels = [];
        } finally {
          this.isLoading = false;
        }
      },
    },
  };
</script>
<template>
  <section v-if="isLoading || loadError || viewedHotels.length" class="discovery-section">
    <h2>{{ $t('userHome.viewedHotels') }}</h2>
    <SkeletonGrid v-if="isLoading" :count="3" image-height="200px" />
    <div v-else-if="loadError" class="guest-section" role="alert">
      <p>{{ $t('guest.loadFailed') }}</p>
      <button type="button" class="guest-button guest-button-secondary" @click="loadViewedHotels">
        {{ $t('guest.retry') }}
      </button>
    </div>
    <div v-else class="guest-property-grid">
      <GuestHotelCard
        v-for="hotel in viewedHotels"
        :key="hotel.id"
        :hotel="hotel"
        @open="redirectToHotelDetails"
      />
    </div>
  </section>
</template>
