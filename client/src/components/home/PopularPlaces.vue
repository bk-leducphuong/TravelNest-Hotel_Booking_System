<script>
  import MediaImage from '@/components/ui/MediaImage.vue';
  import 'vue-loading-overlay/dist/css/index.css';
  import { SearchService } from '@/services/search.service';
  import errorHandler from '@/request/errorHandler.js';
  import { getImageUrl } from '@/utils/images';

  export default {
    name: 'PopularPlaces',
    components: {
      MediaImage,
    },
    data() {
      return {
        isPopularPlacesLoading: false,
        popularPlaces: [],
      };
    },
    mounted() {
      this.loadPopularPlaces();
    },
    methods: {
      displayName(place) {
        if (!place) return '';
        return place.displayName ?? place.city ?? place.location ?? '—';
      },
      getPlaceImage(place) {
        return getImageUrl(place?.images?.primary?.objectKey);
      },
      redirectToSearchResults(place) {
        const stored = this.$store.getters['search/getSearchData'];
        const today = new Date();
        today.setDate(today.getDate() + 1);
        const next = new Date(today);
        next.setDate(next.getDate() + 1);
        const day = (date) =>
          `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        const location = place?.displayName ?? place?.city ?? place?.location ?? '';
        this.$router.push({
          name: 'SearchResults',
          query: {
            location,
            checkInDate: stored.checkInDate || day(today),
            checkOutDate: stored.checkOutDate || day(next),
            adults: stored.adults || 2,
            children: stored.children || 0,
            rooms: stored.rooms || 1,
          },
        });
      },
      async loadPopularPlaces() {
        try {
          this.isPopularPlacesLoading = true;
          // GET /api/v1/search/destinations/trending
          const response = await SearchService.getTrendingDestinations({ limit: 5, days: 30 });
          const list = response?.data?.destinations ?? response?.destinations ?? [];
          this.popularPlaces = Array.isArray(list) ? list : [];
        } catch (error) {
          errorHandler(error);
          this.popularPlaces = [];
        } finally {
          this.isPopularPlacesLoading = false;
        }
      },
    },
  };
</script>
<template>
  <section v-if="isPopularPlacesLoading || popularPlaces.length" class="discovery-section">
    <h2>{{ $t('userHome.popularPlaces') }}</h2>
    <div class="guest-property-grid">
      <button
        v-for="(place, index) in popularPlaces"
        :key="place.id || index"
        type="button"
        class="destination-card"
        @click="redirectToSearchResults(place)"
      >
        <MediaImage :src="getPlaceImage(place)" :alt="displayName(place)" /><strong>{{
          displayName(place)
        }}</strong>
      </button>
    </div>
  </section>
</template>
<style scoped>
  .destination-card {
    background: white;
    border: 0;
    border-radius: 20px;
    text-align: left;
    overflow: hidden;
    cursor: pointer;
    padding: 0;
    color: var(--tn-brand);
  }
  .destination-card .guest-media {
    height: 180px;
    border-radius: 0;
  }
  .destination-card strong {
    display: block;
    padding: 20px;
    font-size: 17px;
    font-weight: 500;
  }
</style>
