<template>
  <div class="popular-container container" v-if="popularPlaces.length > 0">
    <div class="popular-header">
      <h2 class="h2">{{ $t('userHome.popularPlaces') }}</h2>
      <h4 class="h4">{{ $t('userHome.popularPlaces_1') }}</h4>
    </div>
    <Loading
      v-model:active="_isLoading"
      :can-cancel="true"
      :color="`#003b95`"
      :is-full-page="false"
    />
    <div class="popular-place-card-up-grid popular-place-card-grid">
      <div
        class="popular-place-card"
        v-for="(place, index) in popularPlaces.slice(0, 2)"
        :key="index"
        @click="redirectToSearchResults(place)"
      >
        <img :src="'assets/vietnam_city/' + place.location + '.jpg'" :alt="place.location" />
      </div>
    </div>
    <div
      class="popular-place-card-bottom-grid popular-place-card-grid"
      v-if="popularPlaces.length > 2"
    >
      <div
        class="popular-place-card"
        v-for="(place, index) in popularPlaces.slice(2, 5)"
        :key="index"
        @click="redirectToSearchResults(place)"
      >
        <img :src="getCityImage(place.location)" :alt="place.location" />
      </div>
    </div>
  </div>
</template>

<script>
  import Loading from 'vue-loading-overlay';
  import 'vue-loading-overlay/dist/css/index.css';
  import { HomeService } from '@/services/home.service';
  import errorHandler from '@/request/errorHandler';

  export default {
    name: 'PopularPlaces',
    components: {
      Loading,
    },
    props: {
      popularPlaces: {
        type: Array,
        default: () => [],
      },
      isLoading: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      _isLoading() {
        return this.isLoading;
      },
    },
    methods: {
      redirectToSearchResults(place) {
        this.$router.push({
          name: 'SearchResults',
          query: {
            location: place.location,
            checkInDate: '',
            checkOutDate: '',
            adults: '',
            children: '',
            rooms: '',
          },
        });
      },
      getCityImage(location) {
        return `assets/vietnam_city/${location}.jpg`;
      },
    },
  };
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/index.scss';

  .popular-container {
    margin-bottom: 30px;
    margin-top: 30px;
    position: relative;
  }

  .popular-header {
    margin-bottom: $spacing-lg;
  }

  .h2 {
    font-weight: bolder;
    display: block;
    font-size: 28px;
  }

  .h4 {
    font-weight: lighter;
    font-size: $font-size-sm;
  }

  .popular-place-card-grid {
    display: grid;
    gap: 8px;
    grid-template-rows: 270px;
  }

  .popular-place-card {
    cursor: pointer;
    border-radius: 14px;
    overflow: hidden;
    transition: transform 0.3s ease;

    &:hover {
      transform: scale(1.02);
      background: linear-gradient(180deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 100%);
    }

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      margin: 0;
      border-radius: 14px;
    }
  }

  .popular-place-card-up-grid {
    max-width: 550px;
    max-height: 270px;
    grid-template-columns: repeat(2, 550px);
  }

  .popular-place-card-bottom-grid {
    margin-top: 16px;
    grid-template-columns: repeat(3, 366px);
  }
</style>
