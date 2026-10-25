<script>
  import { mapActions, mapGetters } from 'vuex';
  import { SearchService } from '@/services/search.service';
  import errorHandler from '@/request/errorHandler.js';
  import { getImageUrl } from '@/utils/images';
  import { dedupeRecentSearches } from '@/utils/recentSearches';

  export default {
    name: 'RecentSearchs',
    emits: ['update:recentSearches'],
    data() {
      return {
        recentSearches: [],
      };
    },
    computed: {
      ...mapGetters('auth', ['isUserAuthenticated']),
    },
    mounted() {
      this.loadRecentSearches();
    },
    methods: {
      async loadRecentSearches() {
        if (!this.isUserAuthenticated) {
          try {
            const raw = localStorage.getItem('recentSearches');
            const parsed = raw ? JSON.parse(raw) : [];
            const list = dedupeRecentSearches(parsed);
            if (list.length !== (Array.isArray(parsed) ? parsed.length : 0)) {
              localStorage.setItem('recentSearches', JSON.stringify(list));
            }
            this.recentSearches = list;
          } catch {
            this.recentSearches = [];
          }
          return;
        }
        try {
          // GET /api/v1/search/recent (authenticated only)
          const response = await SearchService.getRecentSearches(10);
          const list = response?.data?.searches ?? response?.searches ?? [];
          this.recentSearches = Array.isArray(list) ? list : [];
        } catch (error) {
          errorHandler(error);
          this.recentSearches = [];
        }
      },
      displayLocation(search) {
        if (!search) return '';
        const city = search.city ?? search.location ?? '';
        const country = search.country ?? '';
        const parts = [city, country].filter(Boolean);
        return parts.length ? parts.join(', ') : '—';
      },
      getCheckIn(search) {
        return search?.checkIn ?? search?.check_in_date ?? '';
      },
      getCheckOut(search) {
        return search?.checkOut ?? search?.check_out_date ?? '';
      },
      formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = typeof dateStr === 'string' ? dateStr.split('T')[0] : dateStr;
        return new Date(d).toLocaleDateString('vi-VN');
      },
      searchKey(search, index) {
        const key = search.city ?? search.location ?? '';
        const checkIn = this.getCheckIn(search);
        const created = search.createdAt ?? search.searchedAt ?? index;
        return `${key}-${checkIn}-${created}`;
      },
      searchImageSrc(search) {
        return getImageUrl(search?.image?.objectKey) || '';
      },
      onImageError(event) {
        event.target.style.display = 'none';
      },
      ...mapActions('search', [
        'updateLocation',
        'updateCheckInDate',
        'updateCheckOutDate',
        'updateAdults',
        'updateChildren',
        'updateRooms',
      ]),
      redirectToSearchResults(search) {
        const checkIn = this.getCheckIn(search).split('T')[0];
        const checkOut = this.getCheckOut(search).split('T')[0];
        const location = search.city ?? search.location ?? search.country ?? '';
        let numberOfDays = search.nights ?? search.number_of_days;
        if (numberOfDays == null && checkIn && checkOut) {
          const a = new Date(checkIn);
          const b = new Date(checkOut);
          numberOfDays = Math.max(1, Math.round((b - a) / (24 * 60 * 60 * 1000)));
        }
        this.$router.push({
          name: 'SearchResults',
          query: {
            location,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            adults: search.adults ?? 1,
            children: search.children ?? 0,
            rooms: search.rooms ?? 1,
            numberOfDays: numberOfDays ?? 1,
          },
        });
      },
      removeSearch(_removedSearch, searchIndex) {
        const updatedSearches = [...this.recentSearches];
        updatedSearches.splice(searchIndex, 1);
        this.recentSearches = updatedSearches;
        this.$emit('update:recentSearches', updatedSearches);
        if (!this.isUserAuthenticated) {
          localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
        }
      },
    },
  };
</script>
<template>
  <section v-if="recentSearches.length" class="discovery-section">
    <h2>{{ $t('userHome.recentSearches') }}</h2>
    <div class="recent-grid">
      <article
        v-for="(search, index) in recentSearches"
        :key="searchKey(search, index)"
        class="guest-section recent-card"
      >
        <button type="button" class="recent-open" @click="redirectToSearchResults(search)">
          <strong>{{ displayLocation(search) }}</strong
          ><span
            >{{ formatDate(getCheckIn(search)) }} → {{ formatDate(getCheckOut(search)) }}</span
          ></button
        ><button
          type="button"
          class="recent-remove"
          :aria-label="$t('guest.removeSearch', { name: displayLocation(search) })"
          @click="removeSearch(search, index)"
        >
          ×
        </button>
      </article>
    </div>
  </section>
</template>
<style scoped>
  .recent-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
  }
  .recent-card {
    position: relative;
    padding: 20px 50px 20px 20px;
  }
  .recent-open {
    background: none;
    border: 0;
    padding: 0;
    display: grid;
    gap: 8px;
    text-align: left;
    cursor: pointer;
    color: var(--tn-brand);
  }
  .recent-open span {
    font-size: 12px;
    color: var(--tn-muted);
  }
  .recent-remove {
    position: absolute;
    right: 8px;
    top: 8px;
    width: 40px;
    height: 40px;
    border: 0;
    border-radius: 10px;
    background: none;
    font-size: 22px;
    color: var(--tn-muted);
    cursor: pointer;
  }
</style>
