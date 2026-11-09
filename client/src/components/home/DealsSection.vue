<script>
  import DiscoverySection from './DiscoverySection.vue';
  import GuestHotelCard from './GuestHotelCard.vue';
  import SkeletonGrid from '@/components/common/SkeletonGrid.vue';
  import ErrorState from '@/components/common/ErrorState.vue';
  import { SearchService } from '@/services/search.service';
  import { mapActions, mapGetters } from 'vuex';

  export default {
    name: 'DealsSection',
    components: {
      DiscoverySection,
      ErrorState,
      GuestHotelCard,
      SkeletonGrid,
    },
    data() {
      return {
        deals: [],
        stay: null,
        isLoading: false,
        loadError: false,
      };
    },
    computed: {
      ...mapGetters('search', ['getSearchData']),
      subtitle() {
        if (!this.stay) return '';
        const params = {
          checkIn: this.formatStayDate(this.stay.checkIn),
          checkOut: this.formatStayDate(this.stay.checkOut),
          count: this.stay.nights,
        };
        return this.$t(
          this.stay.defaulted ? 'userHome.dealSampleDates' : 'userHome.dealDates',
          params
        );
      },
    },
    mounted() {
      this.loadDeals();
    },
    methods: {
      ...mapActions('search', [
        'updateLocation',
        'updateCheckInDate',
        'updateCheckOutDate',
        'updateNumberOfDays',
      ]),
      formatStayDate(value) {
        if (!value) return '';
        const [year, month, day] = String(value).split('-').map(Number);
        if (!year || !month || !day) return value;
        return new Intl.DateTimeFormat(this.$i18n?.locale || 'en', {
          month: 'short',
          day: 'numeric',
        }).format(new Date(year, month - 1, day));
      },
      hasUsableStoredDates(checkIn, checkOut) {
        if (!checkIn || !checkOut) return false;
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return start > today && end > start;
      },
      async loadDeals() {
        try {
          this.isLoading = true;
          this.loadError = false;

          const stored = this.getSearchData || {};
          const params = {
            limit: 8,
            adults: stored.adults || 2,
            children: stored.children || 0,
            rooms: stored.rooms || 1,
          };
          // The persisted search store can contain stale dates. Fall back to
          // the server's sample stay rather than failing the whole section.
          if (this.hasUsableStoredDates(stored.checkInDate, stored.checkOutDate)) {
            params.checkIn = stored.checkInDate;
            params.checkOut = stored.checkOutDate;
          }

          const response = await SearchService.getHotelDeals(params);
          const data = response?.data ?? response ?? {};
          this.deals = Array.isArray(data.hotels) ? data.hotels : [];
          this.stay = data.stay || null;
        } catch (error) {
          this.loadError = true;
          this.deals = [];
          this.stay = null;
        } finally {
          this.isLoading = false;
        }
      },
      redirectToHotelDetails(hotel) {
        const hotelId = hotel.hotel_id ?? hotel.id;
        const cityName = typeof hotel.city === 'string' ? hotel.city : hotel.city?.name;
        if (cityName) this.updateLocation(cityName);

        // The feed may have used the sample stay. Carry it into the hotel page
        // so the deal price the guest just saw is actionable.
        if (this.stay?.defaulted) {
          this.updateCheckInDate(this.stay.checkIn);
          this.updateCheckOutDate(this.stay.checkOut);
          this.updateNumberOfDays(this.stay.nights);
        }

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
    v-if="isLoading || loadError || deals.length"
    :title="$t('userHome.dealsTitle')"
    :subtitle="subtitle"
    section-key="deals"
    :items="deals"
    :busy="isLoading"
  >
    <template #status>
      <SkeletonGrid v-if="isLoading" :count="4" image-height="200px" />
      <ErrorState v-else-if="loadError" @retry="loadDeals" />
    </template>
    <template #default="{ items: visibleItems }">
      <GuestHotelCard
        v-for="hotel in visibleItems"
        :key="hotel.hotel_id"
        :hotel="hotel"
        @open="redirectToHotelDetails"
      />
    </template>
  </DiscoverySection>
</template>
