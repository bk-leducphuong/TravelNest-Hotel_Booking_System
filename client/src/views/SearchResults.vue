<script>
  import TheHeader from '@/components/Header.vue';
  import MapComponent from '@/components/map/MapComponent.vue';
  import TheFooter from '@/components/Footer.vue';
  import HotelFilterSidebar from '@/components/search/HotelFilterSidebar.vue';
  import { mapActions, mapGetters } from 'vuex';
  import { useToast } from 'vue-toastification';
  import SavedHotelIcon from '@/components/SavedHotelIcon.vue';
  import { SearchService } from '@/services/search.service';
  import SkeletonGrid from '@/components/common/SkeletonGrid.vue';
  import EmptyState from '@/components/common/EmptyState.vue';
  import PaginationControls from '@/components/common/PaginationControls.vue';
  import errorHandler from '@/request/errorHandler';
  import { getImageUrl } from '@/utils/images';
  import { resultRange } from '@/utils/pagination';
  import { stayNights } from '@/utils/stay';
  import { guestMoney, ratingLabelKey } from '@/utils/guestPresentation';
  import MediaImage from '@/components/ui/MediaImage.vue';

  export default {
    components: {
      MediaImage,
      TheHeader,
      MapComponent,
      TheFooter,
      HotelFilterSidebar,
      SavedHotelIcon,
      SkeletonGrid,
      EmptyState,
      PaginationControls,
    },
    setup() {
      // Get toast interface
      const toast = useToast();
      // Make it available inside methods
      return { toast };
    },
    data() {
      return {
        noResultsFound: false,
        openMapPopup: false,
        openFilters: false,
        searchVersion: 0,
        queryVersion: 0,
        hotels: [],
        displayHotels: [],
        sortCriteria: '',
        searchQuery: '',
        filteredHotels: [],
        isLoading: false,
        searchError: null,
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        lastSavedSearchKey: '',
        filters: {
          minPrice: null,
          maxPrice: null,
          amenities: [],
          mealPlans: [],
          freeCancellation: false,
          hotelClass: [],
          minRating: null,
          radius: null,
        },
        filterOptions: {},
      };
    },
    computed: {
      ...mapGetters('search', ['getSearchData']),
      ...mapGetters('auth', ['isUserAuthenticated']),
      totalResults() {
        return this.pagination.total || this.hotels.length;
      },
      showPagination() {
        return !this.searchQuery && this.pagination.totalPages > 1;
      },
      paginationSummary() {
        if (this.totalResults === 0) return '';
        const { start, end } = resultRange(
          this.pagination.page,
          this.pagination.limit,
          this.totalResults
        );
        return this.$t('searchResults.showingRange', {
          start,
          end,
          total: this.totalResults,
        });
      },
      sortByParam() {
        const map = {
          priceLowToHigh: 'price_asc',
          priceHighToLow: 'price_desc',
          ratingHighToLow: 'rating',
        };
        return map[this.sortCriteria] || 'relevance';
      },
      hasCoordinates() {
        return Boolean(this.$route.query.latitude && this.$route.query.longitude);
      },
      // The stay length is derived from the dates when the URL omits
      // `numberOfDays` (e.g. a shared link), instead of silently failing.
      computedNumberOfDays() {
        return (
          stayNights(this.$route.query.checkInDate, this.$route.query.checkOutDate) || undefined
        );
      },
    },
    watch: {
      '$route.query': {
        async handler() {
          const version = ++this.queryVersion;
          if (this.isSearchUrlValid()) {
            this.isLoading = true;
            this.syncPaginationFromRoute();
            this.syncFiltersFromRoute();
            this.syncSortFromRoute();
            this.updateSearchDataInStore();
            await this.saveSearchInformationOnce();
            if (version !== this.queryVersion) return;
            await this.searchHotels();
            if (version === this.queryVersion) this.isLoading = false;
          } else {
            this.searchVersion++;
            this.isLoading = false;
            this.hotels = [];
            this.searchError = this.$t('searchResults.incompleteSearch');
          }
        },
        immediate: true,
      },
      hotels(newValue) {
        this.filterHotels();
      },
      filteredHotels(newValue) {
        this.displayHotels = newValue;
      },
    },
    methods: {
      getImageUrl,
      guestMoney,
      ratingLabelKey,
      ...mapActions('search', [
        'updateLocation',
        'updateCheckInDate',
        'updateCheckOutDate',
        'updateNumberOfDays',
        'updateAdults',
        'updateRooms',
        'updateChildren',
        'saveSearchInformation',
      ]),
      getDefaultFilters() {
        return {
          minPrice: null,
          maxPrice: null,
          amenities: [],
          mealPlans: [],
          freeCancellation: false,
          hotelClass: [],
          minRating: null,
          radius: null,
        };
      },
      isSearchUrlValid() {
        return this.$route.query.location &&
          this.$route.query.checkInDate &&
          this.$route.query.checkOutDate &&
          this.$route.query.adults &&
          this.$route.query.children &&
          this.$route.query.rooms &&
          this.computedNumberOfDays
          ? true
          : false;
      },
      // Deep-linked searches may carry a slug (e.g. "ha-noi"); show a readable
      // name ("Ha Noi") rather than the raw slug.
      locationLabel() {
        const raw = this.$route.query.location;
        if (!raw) {
          return '';
        }
        const value = String(Array.isArray(raw) ? raw[0] : raw);
        if (/^[a-z0-9]+(?:[-_][a-z0-9]+)+$/.test(value)) {
          return value
            .split(/[-_]/)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
        }
        return value;
      },
      updateSearchDataInStore() {
        this.updateLocation(this.$route.query.location);
        this.updateCheckInDate(this.$route.query.checkInDate);
        this.updateCheckOutDate(this.$route.query.checkOutDate);
        this.updateNumberOfDays(this.computedNumberOfDays);
        this.updateAdults(this.$route.query.adults);
        this.updateRooms(this.$route.query.rooms);
        this.updateChildren(this.$route.query.children);
      },
      getSearchCriteriaKey() {
        const { location, checkInDate, checkOutDate, adults, children, rooms, numberOfDays } =
          this.$route.query;

        return JSON.stringify({
          location,
          checkInDate,
          checkOutDate,
          adults,
          children,
          rooms,
          numberOfDays,
        });
      },
      async saveSearchInformationOnce() {
        const searchKey = this.getSearchCriteriaKey();
        if (searchKey === this.lastSavedSearchKey) return;

        this.lastSavedSearchKey = searchKey;
        await this.saveSearchInformation();
      },
      syncPaginationFromRoute() {
        const page = parseInt(this.$route.query.page, 10);
        this.pagination.page = Number.isInteger(page) && page > 0 ? page : 1;
      },
      parseNumber(value) {
        const numberValue = Number(value);
        return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
      },
      parseArrayParam(value, mapper = (item) => item) {
        const rawValues = Array.isArray(value) ? value : String(value || '').split(',');
        return rawValues
          .map((item) => mapper(String(item).trim()))
          .filter((item) => item !== '' && item !== null && item !== undefined);
      },
      syncFiltersFromRoute() {
        const query = this.$route.query;
        this.filters = {
          ...this.getDefaultFilters(),
          minPrice: this.parseNumber(query.minPrice),
          maxPrice: this.parseNumber(query.maxPrice),
          amenities: this.parseArrayParam(query.amenities),
          mealPlans: this.parseArrayParam(query.mealPlans),
          freeCancellation: query.freeCancellation === true || query.freeCancellation === 'true',
          hotelClass: this.parseArrayParam(query.hotelClass, (item) => {
            const star = parseInt(item, 10);
            return Number.isInteger(star) && star >= 1 && star <= 5 ? star : null;
          }),
          minRating: this.parseNumber(query.minRating),
          radius: this.parseNumber(query.radius),
        };
      },
      getMergedAmenities(filters = this.filters) {
        return Array.from(new Set([...(filters.amenities || []), ...(filters.mealPlans || [])]));
      },
      buildFilterParams() {
        const params = {};
        const amenities = this.getMergedAmenities();

        if (this.filters.minPrice) params.minPrice = this.filters.minPrice;
        if (this.filters.maxPrice) params.maxPrice = this.filters.maxPrice;
        if (this.filters.minRating) params.minRating = this.filters.minRating;
        if (this.filters.freeCancellation) params.freeCancellation = true;
        if (this.filters.hotelClass.length) params.hotelClass = this.filters.hotelClass.join(',');
        if (amenities.length) params.amenities = amenities.join(',');
        if (this.filters.radius && this.hasCoordinates) params.radius = this.filters.radius;

        return params;
      },
      serializeFiltersToQuery(filters) {
        const nextQuery = { ...this.$route.query };
        const filterKeys = [
          'minPrice',
          'maxPrice',
          'amenities',
          'mealPlans',
          'freeCancellation',
          'hotelClass',
          'minRating',
          'radius',
        ];

        filterKeys.forEach((key) => {
          delete nextQuery[key];
        });

        if (filters.minPrice) nextQuery.minPrice = String(filters.minPrice);
        if (filters.maxPrice) nextQuery.maxPrice = String(filters.maxPrice);
        if (filters.amenities?.length) nextQuery.amenities = filters.amenities.join(',');
        if (filters.mealPlans?.length) nextQuery.mealPlans = filters.mealPlans.join(',');
        if (filters.freeCancellation) nextQuery.freeCancellation = 'true';
        if (filters.hotelClass?.length) nextQuery.hotelClass = filters.hotelClass.join(',');
        if (filters.minRating) nextQuery.minRating = String(filters.minRating);
        if (filters.radius && this.hasCoordinates) nextQuery.radius = String(filters.radius);

        nextQuery.page = 1;
        return nextQuery;
      },
      handleFilterChange(nextFilters) {
        this.$router.push({
          query: this.serializeFiltersToQuery(nextFilters),
        });
      },
      clearFilters() {
        this.$router.push({
          query: this.serializeFiltersToQuery(this.getDefaultFilters()),
        });
      },
      async searchHotels() {
        if (!this.isSearchUrlValid()) return;
        const version = ++this.searchVersion;
        this.isLoading = true;
        try {
          const data = this.getSearchData;
          const params = {
            city: data.location,
            checkIn: data.checkInDate,
            checkOut: data.checkOutDate,
            adults: parseInt(data.adults, 10) || 2,
            children: parseInt(data.children, 10) || 0,
            rooms: parseInt(data.rooms, 10) || 1,
            sortBy: this.sortByParam,
            page: this.pagination.page,
            limit: this.pagination.limit,
            ...this.buildFilterParams(),
          };

          if (this.$route.query.latitude && this.$route.query.longitude) {
            params.latitude = this.$route.query.latitude;
            params.longitude = this.$route.query.longitude;
          }

          if (this.$route.query.destinationId) {
            params.destinationId = this.$route.query.destinationId;
          }

          const response = await SearchService.searchHotels(params);
          if (version !== this.searchVersion) return;
          const result = response?.data ?? response;
          const list = result?.hotels ?? [];
          const pag = result?.pagination ?? {};

          this.hotels = list;
          this.filterOptions = result?.filter_options ?? result?.facets ?? {};
          this.pagination = {
            page: pag.page ?? 1,
            limit: pag.limit ?? 20,
            total: pag.total ?? 0,
            totalPages: pag.totalPages ?? 0,
          };
          this.searchError = null;
          this.noResultsFound = list.length === 0;
        } catch (error) {
          if (version !== this.searchVersion) return;
          errorHandler(error);
          // Surface the failure instead of showing a misleading "0 hotels".
          this.searchError =
            error?.response?.data?.error?.message ||
            error?.response?.data?.message ||
            this.$t('searchResults.loadError');
          this.hotels = [];
          this.noResultsFound = false;
        } finally {
          if (version === this.searchVersion) this.isLoading = false;
        }
      },
      // close the map popup
      closeMapPopup() {
        this.openMapPopup = false;
      },
      redirectToHotelDetails(hotelId) {
        const viewedHotels = localStorage.getItem('viewedHotels')
          ? JSON.parse(localStorage.getItem('viewedHotels'))
          : [];
        const index = viewedHotels.findIndex((id) => id === hotelId);
        if (index !== -1) viewedHotels.splice(index, 1);
        viewedHotels.push(hotelId);
        localStorage.setItem('viewedHotels', JSON.stringify(viewedHotels));
        this.$router.push({ name: 'HotelDetails', params: { hotel_id: hotelId } });
      },
      // Sort lives in the URL query (e.g. `?sort=priceLowToHigh`) so refresh,
      // back/forward and shared links keep the selected order. Changing it
      // resets to page 1 and lets the `$route.query` watcher run the search.
      getValidSortCriteria(value) {
        const allowed = ['priceLowToHigh', 'priceHighToLow', 'ratingHighToLow'];
        const raw = Array.isArray(value) ? value[0] : value;
        return allowed.includes(raw) ? raw : '';
      },
      syncSortFromRoute() {
        this.sortCriteria = this.getValidSortCriteria(this.$route.query.sort);
      },
      handleSort(event) {
        const sort = this.getValidSortCriteria(event?.target?.value);
        this.sortCriteria = sort;

        const nextQuery = { ...this.$route.query, page: 1 };
        if (sort) {
          nextQuery.sort = sort;
        } else {
          delete nextQuery.sort;
        }

        this.$router.push({ query: nextQuery });
      },
      updateRoutePage(page) {
        const nextPage = Math.min(Math.max(page, 1), this.pagination.totalPages || page);
        this.$router.push({
          query: {
            ...this.$route.query,
            page: nextPage,
          },
        });
      },
      async changePage(page) {
        if (
          page === this.pagination.page ||
          page < 1 ||
          (this.pagination.totalPages && page > this.pagination.totalPages)
        ) {
          return;
        }

        this.updateRoutePage(page);
        this.$nextTick(() => {
          const container = document.querySelector('.inner-content');
          container?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      },
      filterHotels() {
        const query = this.searchQuery.trim().toLowerCase();
        const name = (h) => (h.hotel_name || h.name || '').toLowerCase();
        this.filteredHotels = this.hotels.filter((hotel) => name(hotel).includes(query));
      },
      escapeHtml(value) {
        return String(value ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      },
      highlightMatch(name) {
        // Escape for HTML *and* regex: hotel names are data (host-controlled)
        // and the search query is user input, so neither can be trusted inside
        // v-html / `new RegExp`.
        const escapedName = this.escapeHtml(name);
        const query = (this.searchQuery || '').trim();
        if (!query) return escapedName;
        const escapedQuery = this.escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        return escapedName.replace(regex, '<mark style="background-color: #5dabff;">$1</mark>');
      },
      serverHost() {
        return import.meta.env.VITE_SERVER_HOST;
      },
    },
    mounted() {
      this.displayHotels = this.hotels;
    },
  };
</script>
<template>
  <TheHeader :is-search-open="true" />
  <MapComponent v-if="openMapPopup" :hotels="hotels" @close-map-popup="closeMapPopup" />
  <main id="guest-main" tabindex="-1" class="guest-page search-page">
    <div class="search-page-heading inner-content">
      <div>
        <h1 class="guest-page-title">
          <strong
            >{{ locationLabel() }} · {{ $t('searchResults.foundTitle_1') }} {{ totalResults }}
            {{ $t('searchResults.foundTitle_2') }}</strong
          >
        </h1>
        <p class="guest-subtitle">{{ $t('guest.searchHint') }}</p>
      </div>
    </div>
    <div class="search-toolbar">
      <button
        type="button"
        class="guest-button guest-button-secondary mobile-filter"
        @click="openFilters = true"
      >
        {{ $t('filters.title') }}
      </button>
      <label class="search-sort"
        >{{ $t('searchResults.sortBy')
        }}<select
          :value="sortCriteria"
          :aria-label="$t('searchResults.sortBy')"
          @change="handleSort"
        >
          <option value="">{{ $t('searchResults.sortTop') }}</option>
          <option value="priceLowToHigh">{{ $t('searchResults.sortPriceAsc') }}</option>
          <option value="priceHighToLow">{{ $t('searchResults.sortPriceDesc') }}</option>
          <option value="ratingHighToLow">{{ $t('searchResults.sortRating') }}</option>
        </select></label
      >
      <button
        type="button"
        class="guest-button guest-button-secondary"
        @click="openMapPopup = true"
      >
        {{ $t('searchResults.showOnMap') }}
      </button>
    </div>
    <div class="search-layout">
      <aside class="desktop-filters">
        <HotelFilterSidebar
          :filters="filters"
          :filter-options="filterOptions"
          :is-loading="isLoading"
          :has-coordinates="hasCoordinates"
          @update:filters="handleFilterChange"
          @clear-filters="clearFilters"
        />
      </aside>
      <section class="search-results" :aria-label="$t('guest.page.search')" :aria-busy="isLoading">
        <label class="hotel-name-search"
          ><span>{{ $t('guest.searchByName') }}</span
          ><input
            v-model="searchQuery"
            type="search"
            :placeholder="$t('searchResults.searchPlaceholder')"
            @input="filterHotels"
        /></label>
        <div v-if="searchError" role="alert" class="guest-section">
          <p>{{ searchError }}</p>
          <button
            type="button"
            v-if="isSearchUrlValid()"
            class="guest-button"
            @click="searchHotels"
          >
            {{ $t('guest.retry') }}
          </button>
        </div>
        <SkeletonGrid v-else-if="isLoading" :count="4" image-height="200px" />
        <template v-else-if="displayHotels.length">
          <article
            v-for="hotel in displayHotels"
            :key="hotel.hotel_id"
            class="guest-section room-infor"
          >
            <div class="result-photo">
              <MediaImage
                :src="hotel.primary_image_url || ''"
                :alt="hotel.hotel_name || hotel.name"
              /><SavedHotelIcon
                :hotel-id="hotel.hotel_id"
                :initial-is-favorite="hotel.is_favorite ?? hotel.isFavorite ?? false"
                :use-initial-favorite-status="true"
              />
            </div>
            <div class="result-info">
              <h2>
                <RouterLink
                  :to="{ name: 'HotelDetails', params: { hotel_id: hotel.hotel_id } }"
                  @click.prevent="redirectToHotelDetails(hotel.hotel_id)"
                  >{{ hotel.hotel_name || hotel.name }}</RouterLink
                >
              </h2>
              <p class="result-location">
                {{ [hotel.city, hotel.country].filter(Boolean).join(', ') }}
              </p>
              <p v-if="hotel.hotel_class" class="result-class">
                {{ $t('guest.hotelClass', { count: hotel.hotel_class }) }}
              </p>
              <p v-if="hotel.has_free_cancellation" class="result-policy">
                {{ $t('guest.cancellationAvailable') }}
              </p>
              <p v-if="hotel.avg_rating > 0" class="result-rating">
                <span class="guest-score">{{ hotel.avg_rating }}<small>/10</small></span
                ><span
                  >{{ $t(ratingLabelKey(hotel.avg_rating))
                  }}<small>{{
                    $t('searchResults.reviewCount', { count: hotel.review_count ?? 0 })
                  }}</small></span
                >
              </p>
            </div>
            <div class="result-price">
              <span>{{ $t('guest.stayFrom') }}</span
              ><strong>{{ guestMoney(hotel.min_price_for_dates, 'USD', $i18n.locale) }}</strong
              ><span
                >{{ $t('bookingFlow.nightPlural', { count: computedNumberOfDays }) }} ·
                {{ $t('guest.oneRoom') }}</span
              ><RouterLink
                class="guest-button"
                :to="{ name: 'HotelDetails', params: { hotel_id: hotel.hotel_id } }"
                @click.prevent="redirectToHotelDetails(hotel.hotel_id)"
                >{{ $t('searchResults.viewAvailability') }}</RouterLink
              ><small>{{ $t('guest.finalQuote') }}</small>
            </div>
          </article>
        </template>
        <EmptyState
          v-else
          :title="$t('searchResults.noHotelsTitle')"
          :message="$t('searchResults.noHotelsMessage')"
        />
        <PaginationControls
          v-if="showPagination && !searchError"
          :page="pagination.page"
          :total-pages="pagination.totalPages"
          :total="totalResults"
          :limit="pagination.limit"
          :is-loading="isLoading"
          :summary="paginationSummary"
          @change="changePage"
        />
      </section>
    </div>
  </main>
  <el-drawer
    v-model="openFilters"
    :title="$t('filters.title')"
    size="min(92%, 420px)"
    append-to-body
  >
    <HotelFilterSidebar
      :filters="filters"
      :filter-options="filterOptions"
      :is-loading="isLoading"
      :has-coordinates="hasCoordinates"
      @update:filters="handleFilterChange"
      @clear-filters="clearFilters"
    />
    <template #footer
      ><button type="button" class="guest-button" @click="openFilters = false">
        {{ $t('guest.showResults') }}
      </button></template
    >
  </el-drawer>
  <TheFooter />
</template>
<style scoped>
  .search-page-heading {
    margin: 0 0 24px;
  }
  .search-page-heading strong {
    font-weight: 500;
  }
  .search-toolbar {
    display: flex;
    gap: 16px;
    justify-content: flex-end;
    align-items: center;
    margin-bottom: 24px;
  }
  .search-sort {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    margin: 0;
  }
  .search-sort select,
  .hotel-name-search input {
    min-height: 44px;
    border: 1px solid #ddd;
    border-radius: 10px;
    padding: 8px 12px;
    background: white;
    color: var(--tn-ink);
    max-width: 100%;
  }
  .search-layout {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    gap: 24px;
    align-items: start;
  }
  .desktop-filters {
    border-radius: 20px;
    overflow: hidden;
  }
  .search-results {
    min-width: 0;
    display: grid;
    gap: 20px;
  }
  .hotel-name-search {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 13px;
    margin: 0;
  }
  .hotel-name-search input {
    flex: 1;
    min-width: 0;
  }
  .room-infor {
    display: grid;
    grid-template-columns: 200px minmax(0, 1fr) 180px;
    gap: 20px;
  }
  .result-photo {
    position: relative;
  }
  .result-photo .guest-media {
    height: 100%;
    min-height: 210px;
  }
  .result-info h2 {
    font-size: 22px;
    margin: 0 0 6px;
    font-weight: 500;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
  .result-info p {
    font-size: 12px;
    margin: 8px 0;
  }
  .result-location,
  .result-class {
    color: var(--tn-muted);
  }
  .result-policy {
    color: #137333;
  }
  .result-rating {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .result-rating small {
    display: block;
    color: var(--tn-muted);
  }
  .result-rating .guest-score small {
    color: white;
  }
  .result-price {
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-end;
    justify-content: center;
    font-size: 12px;
    text-align: right;
  }
  .result-price strong {
    font-size: 24px;
    color: var(--tn-ink);
  }
  .result-price small {
    color: var(--tn-muted);
    font-size: 11px;
  }
  .mobile-filter {
    display: none;
  }
  @media (max-width: 1199px) {
    .room-infor {
      grid-template-columns: 160px minmax(0, 1fr);
    }
    .result-price {
      grid-column: 2;
      align-items: flex-start;
      text-align: left;
    }
    .result-photo {
      grid-row: span 2;
    }
  }
  @media (max-width: 1023px) {
    .desktop-filters {
      display: none;
    }
    .mobile-filter {
      display: inline-flex;
    }
    .search-layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  @media (max-width: 600px) {
    .search-toolbar {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .search-sort {
      grid-column: 1 / -1;
      grid-row: 2;
      flex-wrap: wrap;
    }
    .search-sort select {
      flex: 1;
      min-width: 0;
    }
    .hotel-name-search {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }
    .room-infor {
      grid-template-columns: minmax(0, 1fr);
      gap: 16px;
    }
    .result-photo {
      grid-row: auto;
    }
    .result-photo .guest-media {
      height: 210px;
    }
    .result-price {
      grid-column: auto;
      align-items: stretch;
      text-align: left;
    }
    .result-price strong {
      font-size: 24px;
    }
  }
</style>
