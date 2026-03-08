<script>
  import TheHeader from '../components/Header.vue';
  import TheFooter from '../components/Footer.vue';
  import NewUserPopup from '@/components/NewUserPopup.vue';
  import RecentSearchs from '@/components/home/RecentSearchs.vue';
  import ViewedHotels from '@/components/home/ViewedHotels.vue';
  import TrendingHotels from '@/components/home/TrendingHotels.vue';
  import PopularPlaces from '@/components/home/PopularPlaces.vue';
  import { mapGetters } from 'vuex';
  import errorHandler from '@/request/errorHandler.js';

  export default {
    components: {
      TheHeader,
      TheFooter,
      NewUserPopup,
      RecentSearchs,
      ViewedHotels,
      TrendingHotels,
      PopularPlaces,
    },
    data() {
      return {
        isNewUserPopupOpen: false,
      };
    },
    mounted() {
      if (!this.isUserAuthenticated) {
        const isNewUser = localStorage.getItem('isNewUser');
        if (!isNewUser) {
          localStorage.setItem('isNewUser', 'true');
          this.isNewUserPopupOpen = true;
        } else {
          localStorage.setItem('isNewUser', 'false');
        }
      } else {
        localStorage.setItem('isNewUser', 'false');
      }
    },
    methods: {
      handleRecentSearchesUpdate(updatedSearches) {
        this.recentSearches = updatedSearches;
      },
    },
  };
</script>

<template>
  <NewUserPopup v-if="isNewUserPopupOpen" @close="isNewUserPopupOpen = false" />
  <TheHeader :isSearchOpen="true" />
  <div class="home-container">
    <RecentSearchs @update:recentSearches="handleRecentSearchesUpdate" />
    <ViewedHotels />
    <TrendingHotels />
    <PopularPlaces />
  </div>
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
