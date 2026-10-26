<script>
  import DiscoverySection from './DiscoverySection.vue';
  import MediaImage from '@/components/ui/MediaImage.vue';
  import 'vue-loading-overlay/dist/css/index.css';
  import { SearchService } from '@/services/search.service';
  import ErrorState from '@/components/common/ErrorState.vue';
  import { getImageUrl } from '@/utils/images';

  export default {
    name: 'PopularPlaces',
    components: {
      DiscoverySection,
      ErrorState,
      MediaImage,
    },
    data() {
      return {
        isPopularPlacesLoading: false,
        loadError: false,
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
        this.loadError = false;
        try {
          this.isPopularPlacesLoading = true;
          // GET /api/v1/search/destinations/trending
          const response = await SearchService.getTrendingDestinations({ limit: 5, days: 30 });
          const list = response?.data?.destinations ?? response?.destinations ?? [];
          this.popularPlaces = Array.isArray(list) ? list : [];
        } catch (error) {
          this.loadError = true;
          this.popularPlaces = [];
        } finally {
          this.isPopularPlacesLoading = false;
        }
      },
    },
  };
</script>
<template>
  <DiscoverySection
    v-if="isPopularPlacesLoading || loadError || popularPlaces.length"
    :title="$t('userHome.popularPlaces')"
    section-key="popular-places"
    :items="popularPlaces"
    :busy="isPopularPlacesLoading"
  >
    <template #status>
      <ErrorState v-if="loadError" @retry="loadPopularPlaces" />
    </template>
    <template #default="{ items: visibleItems }">
      <button
        v-for="(place, index) in visibleItems"
        :key="place.id || index"
        type="button"
        class="destination-card"
        @click="redirectToSearchResults(place)"
      >
        <MediaImage :src="getPlaceImage(place)" :alt="displayName(place)" /><strong>{{
          displayName(place)
        }}</strong>
      </button>
    </template>
  </DiscoverySection>
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
