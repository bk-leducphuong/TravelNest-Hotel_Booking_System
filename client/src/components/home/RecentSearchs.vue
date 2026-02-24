<template>
  <div class="recent-search-container container" v-if="recentSearches.length > 0">
    <h2 class="h2">{{ $t('userHome.recentSearches') }}</h2>
    <div class="slider-container">
      <ElCarousel
        :interval="0"
        :arrow="groupedSearches.length > 1 ? 'hover' : 'never'"
        indicator-position="none"
        height="96px"
        class="search-carousel"
      >
        <ElCarouselItem v-for="(group, groupIndex) in groupedSearches" :key="groupIndex">
          <div class="search-group">
            <div
              class="search-card"
              v-for="(search, index) in group"
              :key="index"
              @click="redirectToSearchResults(search)"
            >
              <div class="search-image">
                <img
                  :src="'assets/vietnam_city/' + search.location + '.jpg'"
                  :alt="search.location"
                />
              </div>
              <div class="search-content">
                <h2 class="search-title">{{ search.location }}</h2>
                <p class="search-details">
                  From {{ new Date(search.check_in_date).toLocaleDateString('vi-VN') }} to
                  {{ new Date(search.check_out_date).toLocaleDateString('vi-VN') }}
                </p>
              </div>
              <button class="close-button" @click.stop="removeSearch(search, groupIndex * itemsPerSlide + index)">×</button>
            </div>
          </div>
        </ElCarouselItem>
      </ElCarousel>
    </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex'
import { HomeService } from '@/services/home.service'
import errorHandler from '@/request/errorHandler'

export default {
  name: 'RecentSearchs',
  props: {
    recentSearches: {
      type: Array,
      default: () => []
    },
    isUserAuthenticated: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:recentSearches'],
  data() {
    return {
      windowWidth: typeof window !== 'undefined' ? window.innerWidth : 1200
    }
  },
  computed: {
    itemsPerSlide() {
      if (this.windowWidth >= 1400) return 5
      if (this.windowWidth >= 1200) return 4
      if (this.windowWidth >= 768) return 3
      return 2
    },
    groupedSearches() {
      const groups = []
      for (let i = 0; i < this.recentSearches.length; i += this.itemsPerSlide) {
        groups.push(this.recentSearches.slice(i, i + this.itemsPerSlide))
      }
      return groups
    }
  },
  mounted() {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleResize)
      this.handleResize()
    }
  },
  beforeUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize)
    }
  },
  methods: {
    handleResize() {
      this.windowWidth = window.innerWidth
    },
    ...mapActions('search', [
      'updateLocation',
      'updateCheckInDate',
      'updateCheckOutDate',
      'updateAdults',
      'updateChildren',
      'updateRooms'
    ]),
    redirectToSearchResults(search) {
      this.$router.push({
        name: 'SearchResults',
        query: {
          location: search.location,
          checkInDate: search.check_in_date.split('T')[0],
          checkOutDate: search.check_out_date.split('T')[0],
          adults: search.adults,
          children: search.children,
          rooms: search.rooms,
          numberOfDays: search.number_of_days
        }
      })
    },
    async removeSearch(removedSearch, searchIndex) {
      try {
        const updatedSearches = [...this.recentSearches]
        updatedSearches.splice(searchIndex, 1)
        this.$emit('update:recentSearches', updatedSearches)
        
        // Update local storage
        if (!this.isUserAuthenticated) {
          localStorage.setItem('recentSearches', JSON.stringify(updatedSearches))
        }

        // Remove from database if authenticated
        if (this.isUserAuthenticated) {
          await HomeService.removeRecentSearch(removedSearch.search_id)
        }
      } catch (error) {
        errorHandler(error)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/index.scss';

.recent-search-container {
  margin-bottom: 30px;
  margin-top: 30px;
  position: relative;
}

.h2 {
  font-weight: bolder;
  display: block;
  font-size: 28px;
}

.slider-container {
  position: relative;
}

.search-carousel {
  :deep(.el-carousel__container) {
    height: 96px;
  }

  :deep(.el-carousel__item) {
    padding: 0 $spacing-sm;
  }
}

.search-group {
  display: flex;
  gap: $spacing-lg;
  justify-content: center;
  height: 100%;
  align-items: center;
}

.search-card {
  flex: 0 0 400px;
  background: $white;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: relative;
  transition: transform 0.3s;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
  }

  @media (max-width: 1400px) {
    flex: 0 0 calc((100% - 60px) / 4);
    max-width: 400px;
  }

  @media (max-width: 1200px) {
    flex: 0 0 calc((100% - 40px) / 3);
    max-width: 400px;
  }

  @media (max-width: 768px) {
    flex: 0 0 calc((100% - 20px) / 2);
    max-width: 400px;
  }
}

.search-image {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
  }
}

.search-content {
  flex-grow: 1;
}

.search-title {
  font-size: $font-size-base;
  font-weight: 600;
  color: $text-primary;
  margin: 0 0 4px 0;
}

.search-details {
  font-size: $font-size-sm;
  color: $text-secondary;
  margin: 0;
}

.close-button {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  color: $text-secondary;
  font-size: 25px;
  @include flex-center;
  z-index: 2;
  transition: color 0.2s ease;

  &:hover {
    color: $text-primary;
  }
}
</style>
