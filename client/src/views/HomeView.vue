<script>
  import TheHeader from '../components/Header.vue';
  import TheFooter from '../components/Footer.vue';
  import RecentSearchs from '@/components/home/RecentSearchs.vue';
  import ViewedHotels from '@/components/home/ViewedHotels.vue';
  import TrendingHotels from '@/components/home/TrendingHotels.vue';
  import PopularPlaces from '@/components/home/PopularPlaces.vue';

  export default {
    components: {
      TheHeader,
      TheFooter,
      RecentSearchs,
      ViewedHotels,
      TrendingHotels,
      PopularPlaces,
    },
    methods: {
      handleRecentSearchesUpdate(updatedSearches) {
        this.recentSearches = updatedSearches;
      },
    },
  };
</script>

<template>
  <TheHeader :is-search-open="true" />
  <main id="guest-main" tabindex="-1" class="home-container">
    <RecentSearchs @update:recentSearches="handleRecentSearchesUpdate" />
    <ViewedHotels />
    <TrendingHotels />
    <PopularPlaces />
  </main>
  <TheFooter />
</template>

<style lang="scss" scoped>
  @import '@/assets/styles/index.scss';

  .home-container {
    position: relative;
    clear: both;
    vertical-align: top;
    width: 100%;
    max-width: 1100px;
    margin: auto;
  }

  img {
    display: inline-block;
    border-radius: 12px;
  }
</style>
