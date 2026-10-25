<script>
  import TheHeader from '@/components/Header.vue';
  import TheFooter from '@/components/Footer.vue';
  import SkeletonGrid from '@/components/common/SkeletonGrid.vue';
  import EmptyState from '@/components/common/EmptyState.vue';
  import GuestHotelCard from '@/components/home/GuestHotelCard.vue';
  import { getFirstImageUrl as imageUrl } from '@/utils/images';
  import { mapGetters } from 'vuex';
  import { useToast } from 'vue-toastification';
  import errorHandler from '@/request/errorHandler';
  import { UserService } from '@/services/user.service';
  import { getFirstImageUrl } from '@/utils/images';
  export default {
    components: {
      TheHeader,
      TheFooter,
      SkeletonGrid,
      EmptyState,
      GuestHotelCard,
    },
    setup() {
      const toast = useToast();
      return { toast };
    },
    data() {
      return {
        hotels: [],
        isLoading: false,
        loadError: false,
      };
    },
    computed: {
      ...mapGetters('user', ['getUserInformation']),
    },
    methods: {
      cardData(row) {
        const h = row.hotelInformation || {};
        return {
          id: row.hotel_id,
          name: h.name,
          address: h.address,
          primaryImageUrl: imageUrl(h.image_urls),
          ratingSummary: { overallRating: h.overall_rating },
        };
      },
      async getSavedHotels() {
        try {
          this.isLoading = true;
          this.loadError = false;
          const response = await UserService.getFavoriteHotels();
          this.hotels = response?.data ?? [];
        } catch (error) {
          errorHandler(error);
          this.loadError = true;
        } finally {
          this.isLoading = false;
        }
      },
      // Open the hotel's detail page for a saved card.
      openHotel(hotelId) {
        this.$router.push({ name: 'HotelDetails', params: { hotel_id: hotelId } });
      },
      async deleteSavedHotel(hotel) {
        try {
          await UserService.removeFavoriteHotel(hotel.hotel_id);
          this.hotels = this.hotels.filter((saved) => saved.hotel_id !== hotel.hotel_id);
          const name = hotel.hotelInformation?.name;
          this.toast.success(
            name
              ? this.$t('savedHotel.page.removedWithName', { name })
              : this.$t('savedHotel.page.removed')
          );
        } catch (error) {
          errorHandler(error);
        }
      },
      getFirstImageUrl,
    },
    async mounted() {
      await this.getSavedHotels();
    },
  };
</script>
<template>
  <TheHeader :is-search-open="false" />
  <main id="guest-main" tabindex="-1" class="guest-page">
    <h1 class="guest-page-title">{{ $t('savedHotel.page.title') }}</h1>
    <p class="guest-subtitle">{{ $t('savedHotel.page.savedCount', { count: hotels.length }) }}</p>
    <SkeletonGrid v-if="isLoading" :count="3" image-height="200px" />
    <section v-else-if="loadError" role="alert" class="guest-section">
      <p>{{ $t('guest.loadFailed') }}</p>
      <button type="button" class="guest-button" @click="getSavedHotels">
        {{ $t('guest.retry') }}
      </button>
    </section>
    <EmptyState
      v-else-if="!hotels.length"
      :title="$t('savedHotel.page.emptyTitle')"
      :message="$t('savedHotel.page.emptyMessage')"
    />
    <div v-else class="guest-property-grid saved-grid">
      <GuestHotelCard
        v-for="hotel in hotels"
        :key="hotel.hotel_id"
        class="hotel-card"
        :hotel="cardData(hotel)"
        :show-favorite="false"
        @open="openHotel(hotel.hotel_id)"
        ><template #action
          ><button
            class="close-button"
            type="button"
            :aria-label="$t('savedHotel.page.removeAria', { name: hotel.hotelInformation?.name })"
            @click="deleteSavedHotel(hotel)"
          >
            ×
          </button></template
        ></GuestHotelCard
      >
    </div>
  </main>
  <TheFooter />
</template>
<style scoped>
  .saved-grid {
    margin-top: 24px;
  }
  .close-button {
    position: absolute;
    right: 12px;
    top: 12px;
    min-width: 44px;
    min-height: 44px;
    border: 0;
    border-radius: 50%;
    background: white;
    color: var(--tn-ink);
    font-size: 24px;
    cursor: pointer;
  }
</style>
