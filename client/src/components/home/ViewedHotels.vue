<script>
  import DiscoverySection from './DiscoverySection.vue';
  import { mapActions, mapGetters } from 'vuex';
  import GuestHotelCard from './GuestHotelCard.vue';
  import SkeletonGrid from '@/components/common/SkeletonGrid.vue';
  import { HotelService } from '@/services/hotel.service';
  import ErrorState from '@/components/common/ErrorState.vue';

  export default {
    name: 'ViewedHotels',
    components: {
      DiscoverySection,
      ErrorState,
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

            const response = await HotelService.getHotelsByIds(ids.slice(-10).reverse());
            const list = response?.data ?? response ?? [];
            this.viewedHotels = Array.isArray(list) ? list : [];
            return;
          }

          const response = await HotelService.getRecentlyViewed(10);
          const list = response?.data ?? response ?? [];
          this.viewedHotels = Array.isArray(list) ? list : [];
        } catch (error) {
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
  <DiscoverySection
    v-if="isLoading || loadError || viewedHotels.length"
    :title="$t('userHome.viewedHotels')"
    section-key="viewed-hotels"
    :items="viewedHotels"
    :busy="isLoading"
  >
    <template #status>
      <SkeletonGrid v-if="isLoading" :count="3" image-height="200px" />
      <ErrorState v-else-if="loadError" @retry="loadViewedHotels" />
    </template>
    <template #default="{ items: visibleItems }">
      <GuestHotelCard
        v-for="hotel in visibleItems"
        :key="hotel.id"
        :hotel="hotel"
        @open="redirectToHotelDetails"
      />
    </template>
  </DiscoverySection>
</template>
