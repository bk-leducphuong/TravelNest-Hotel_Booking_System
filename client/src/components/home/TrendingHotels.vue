<script>
  import DiscoverySection from './DiscoverySection.vue';
  import { mapActions } from 'vuex';
  import GuestHotelCard from './GuestHotelCard.vue';
  import SkeletonGrid from '@/components/common/SkeletonGrid.vue';
  import { HotelService } from '@/services/hotel.service';
  import ErrorState from '@/components/common/ErrorState.vue';

  export default {
    name: 'TrendingHotels',
    components: {
      DiscoverySection,
      ErrorState,
      GuestHotelCard,
      SkeletonGrid,
    },
    data() {
      return {
        trendingHotels: [],
        isLoading: false,
        loadError: false,
      };
    },
    mounted() {
      this.loadTrendingHotels();
    },
    methods: {
      async loadTrendingHotels() {
        try {
          this.isLoading = true;
          this.loadError = false;
          const response = await HotelService.getTrendingHotels({ limit: 10, days: 30 });
          const list = response?.data ?? response ?? [];
          this.trendingHotels = Array.isArray(list) ? list : [];
        } catch (error) {
          this.loadError = true;
          this.trendingHotels = [];
        } finally {
          this.isLoading = false;
        }
      },
      ...mapActions('search', ['updateLocation']),
      redirectToHotelDetails(hotel) {
        const hotelId = hotel.id;
        const cityName = hotel.city?.name ?? hotel.city ?? '';
        if (cityName) this.updateLocation(cityName);

        const viewedHotels = localStorage.getItem('viewedHotels')
          ? JSON.parse(localStorage.getItem('viewedHotels'))
          : [];
        const index = viewedHotels.findIndex((id) => id === hotelId);
        if (index !== -1) viewedHotels.splice(index, 1);
        viewedHotels.push(hotelId);
        localStorage.setItem('viewedHotels', JSON.stringify(viewedHotels));

        this.$router.push({ name: 'HotelDetails', params: { hotel_id: hotelId } });
      },
    },
  };
</script>
<template>
  <DiscoverySection
    v-if="isLoading || loadError || trendingHotels.length"
    :title="$t('userHome.trendingHotels')"
    section-key="trending-hotels"
    :items="trendingHotels"
    :busy="isLoading"
  >
    <template #status>
      <SkeletonGrid v-if="isLoading" :count="3" image-height="200px" />
      <ErrorState v-else-if="loadError" @retry="loadTrendingHotels" />
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
