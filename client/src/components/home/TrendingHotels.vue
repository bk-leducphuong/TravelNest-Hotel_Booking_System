<script>
  import { mapActions } from 'vuex';
  import GuestHotelCard from './GuestHotelCard.vue';
  import SkeletonGrid from '@/components/common/SkeletonGrid.vue';
  import { HotelService } from '@/services/hotel.service';
  import errorHandler from '@/request/errorHandler';

  export default {
    name: 'TrendingHotels',
    components: {
      GuestHotelCard,
      SkeletonGrid,
    },
    data() {
      return {
        trendingHotels: [],
        isLoading: false,
        loadError: false,
        gridExpanded: false,
      };
    },
    computed: {
      hasMoreItems() {
        return this.trendingHotels.length > 4;
      },
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
          errorHandler(error);
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
  <section v-if="isLoading || loadError || trendingHotels.length" class="discovery-section">
    <h2>{{ $t('userHome.trendingHotels') }}</h2>
    <SkeletonGrid v-if="isLoading" :count="3" image-height="200px" />
    <div v-else-if="loadError" class="guest-section" role="alert">
      <p>{{ $t('guest.loadFailed') }}</p>
      <button type="button" class="guest-button guest-button-secondary" @click="loadTrendingHotels">
        {{ $t('guest.retry') }}
      </button>
    </div>
    <div v-else class="guest-property-grid" :class="{ 'is-expanded': gridExpanded }">
      <GuestHotelCard
        v-for="hotel in trendingHotels"
        :key="hotel.id"
        :hotel="hotel"
        @open="redirectToHotelDetails"
      />
    </div>
    <button
      v-if="!isLoading && !loadError && hasMoreItems"
      type="button"
      class="guest-button guest-button-secondary see-all"
      @click="gridExpanded = !gridExpanded"
    >
      {{ gridExpanded ? $t('guest.showLess') : $t('guest.seeAll') }}
    </button>
  </section>
</template>
<style scoped>
  .see-all {
    display: none;
    width: max-content;
    margin: 20px auto 0;
  }
  @media (max-width: 767px) {
    .see-all {
      display: block;
    }
    .guest-property-grid:not(.is-expanded) > :nth-child(n + 5) {
      display: none;
    }
  }
</style>
