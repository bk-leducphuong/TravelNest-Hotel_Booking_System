<script>
  import TheHeader from '@/components/Header.vue';
  import MapComponent from '@/components/map/MapComponent.vue';
  import TheFooter from '@/components/Footer.vue';
  import HotelFilterSidebar from '@/components/search/HotelFilterSidebar.vue';
  import { mapActions, mapGetters } from 'vuex';
  import { useToast } from 'vue-toastification';
  import SavedHotelIcon from '@/components/SavedHotelIcon.vue';
  import { SearchService } from '@/services/search.service';
  import Loading from 'vue-loading-overlay';
  import 'vue-loading-overlay/dist/css/index.css';
  import errorHandler from '@/request/errorHandler';
  import { getImageUrl } from '@/utils/images';

  export default {
    components: {
      TheHeader,
      MapComponent,
      TheFooter,
      HotelFilterSidebar,
      SavedHotelIcon,
      Loading,
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
        hotels: [],
        displayHotels: [],
        sortCriteria: '',
        searchQuery: '',
        filteredHotels: [],
        isLoading: false,
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
      pageNumbers() {
        const totalPages = this.pagination.totalPages;
        const currentPage = this.pagination.page;
        const delta = 2;
        const pages = [];
        const start = Math.max(1, currentPage - delta);
        const end = Math.min(totalPages, currentPage + delta);

        if (start > 1) {
          pages.push(1);
          if (start > 2) pages.push('start-ellipsis');
        }

        for (let page = start; page <= end; page += 1) {
          pages.push(page);
        }

        if (end < totalPages) {
          if (end < totalPages - 1) pages.push('end-ellipsis');
          pages.push(totalPages);
        }

        return pages;
      },
      currentResultStart() {
        if (this.totalResults === 0) return 0;
        return (this.pagination.page - 1) * this.pagination.limit + 1;
      },
      currentResultEnd() {
        return Math.min(this.pagination.page * this.pagination.limit, this.totalResults);
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
    },
    watch: {
      '$route.query': {
        async handler() {
          if (this.isSearchUrlValid()) {
            this.isLoading = true;
            this.syncPaginationFromRoute();
            this.syncFiltersFromRoute();
            this.updateSearchDataInStore();
            await this.saveSearchInformationOnce();
            await this.searchHotels();
            this.isLoading = false;
          } else {
            this.toast.error('Vui lòng nhập đầy đủ thông tin tìm kiếm!!');
          }
        },
        immediate: true,
      },
      sortCriteria: {
        async handler() {
          if (this.isSearchUrlValid() && this.hotels.length > 0) {
            if (this.pagination.page !== 1 || this.$route.query.page) {
              this.updateRoutePage(1);
              return;
            }
            this.isLoading = true;
            await this.searchHotels();
            this.isLoading = false;
          }
        },
      },
      hotels(newValue) {
        this.displayHotels = newValue;
      },
      filteredHotels(newValue) {
        if (newValue.length === 0) {
          this.displayHotels = this.hotels;
          return;
        }
        this.displayHotels = newValue;
      },
    },
    methods: {
      getImageUrl,
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
          this.$route.query.numberOfDays
          ? true
          : false;
      },
      updateSearchDataInStore() {
        this.updateLocation(this.$route.query.location);
        this.updateCheckInDate(this.$route.query.checkInDate);
        this.updateCheckOutDate(this.$route.query.checkOutDate);
        this.updateNumberOfDays(this.$route.query.numberOfDays);
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

          const response = await SearchService.searchHotels(params);
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
          this.noResultsFound = list.length === 0;
        } catch (error) {
          errorHandler(error);
          this.hotels = [];
          this.noResultsFound = true;
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
      handleSort() {
        // Kept for the template change event; the watcher handles server-side sorting.
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
        const query = this.searchQuery.toLowerCase();
        const name = (h) => (h.hotel_name || h.name || '').toLowerCase();
        this.filteredHotels = this.hotels.filter((hotel) => name(hotel).includes(query));
      },
      highlightMatch(name) {
        const query = this.searchQuery.trim();
        if (!query) return name;
        const regex = new RegExp(`(${query})`, 'gi');
        return name.replace(regex, '<mark style="background-color: #5dabff;">$1</mark>');
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
  <TheHeader :isSearchOpen="true" />
  <MapComponent v-if="openMapPopup" :hotels="hotels" @close-map-popup="closeMapPopup" />
  <!-- inforSearch -->
  <div class="inforSearch">
    <div class="container">
      <Loading
        v-model:active="isLoading"
        :can-cancel="true"
        :color="`#003b95`"
        :is-full-page="false"
      />
      <div class="inner-wrap">
        <div class="row">
          <div class="col-3">
            <div class="map">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d59582.31596536299!2d105.834667!3d21.036897!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135aba15ec15d17%3A0x620e85c2cfe14d4c!2zTMSDbmcgQ2jhu6cgdOG7i2NoIEjhu5MgQ2jDrSBNaW5o!5e0!3m2!1svi!2sus!4v1729735752435!5m2!1svi!2sus"
                allowfullscreen=""
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
              ></iframe>
              <button class="map-button" @click="openMapPopup = !openMapPopup">
                <svg class="map-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                  />
                </svg>
                Hiển thị trên bản đồ
              </button>
            </div>
            <HotelFilterSidebar
              :filters="filters"
              :filter-options="filterOptions"
              :is-loading="isLoading"
              :has-coordinates="hasCoordinates"
              @update:filters="handleFilterChange"
              @clear-filters="clearFilters"
            />
          </div>
          <hr />

          <div class="col-9">
            <div class="inner-content">
              <strong
                >{{ this.$route.query.location }}: {{ $t('searchResults.foundTitle_1') }}
                {{ totalResults }} {{ $t('searchResults.foundTitle_2') }}</strong
              >
              <div class="arrange">
                <div class="selection-search">
                  <i class="fa-solid fa-repeat"></i>
                  <span>Sắp xếp theo:</span>
                  <!-- Sorting Controls -->
                  <select v-model="sortCriteria" @change="handleSort">
                    <option value="">Lựa chọn hàng đầu của chúng tôi</option>
                    <option value="priceLowToHigh">Giá (ưu tiên thấp nhất)</option>
                    <option value="priceHighToLow">Giá (ưu tiên cao nhất)</option>
                    <option value="ratingHighToLow">Xếp hạng chỗ nghỉ (Cao đến thấp)</option>
                  </select>
                </div>
                <div class="type-search">
                  <input
                    type="text"
                    v-model="searchQuery"
                    placeholder="Search hotels..."
                    @input="filterHotels"
                  />
                  <button>
                    <i
                      class="fa fa-search"
                      aria-hidden="true"
                      style="color: white; cursor: pointer; font-size: larger"
                    ></i>
                  </button>
                </div>
              </div>

              <div v-if="noResultsFound">
                <p>
                  No hotels found matching your criteria. Please try adjusting your search filters.
                </p>
              </div>

              <div
                class="room-infor"
                v-for="hotel in displayHotels"
                :key="hotel.hotel_id"
                @click="redirectToHotelDetails(hotel.hotel_id)"
              >
                <div class="inner-img">
                  <SavedHotelIcon
                    :hotel-id="hotel.hotel_id"
                    :initial-is-favorite="hotel.is_favorite ?? hotel.isFavorite ?? false"
                    :use-initial-favorite-status="true"
                  />
                  <img
                    v-if="hotel.primary_image_url"
                    :src="getImageUrl(hotel.primary_image_url)"
                    alt="hotel image"
                  />
                  <img
                    v-else
                    :src="serverHost() + '/uploads/hotels/no-image.png'"
                    alt="hotel image"
                  />
                </div>
                <div class="inner-show">
                  <div class="inner-introduction">
                    <div class="inner-name">
                      <strong class="hotel-name">
                        <span v-html="highlightMatch(hotel.hotel_name || hotel.name)"></span>
                      </strong>
                      <br />
                      <div class="address-container">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="currentColor"
                          class="bi bi-geo-alt-fill"
                          viewBox="0 0 16 16"
                        >
                          <path
                            d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10m0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6"
                          />
                        </svg>
                        <span class="location" style="margin-left: 5px">
                          {{ [hotel.city, hotel.country].filter(Boolean).join(', ') || '—' }}
                        </span>
                      </div>
                    </div>
                    <div class="inner-review">
                      <div class="award">
                        <span>Tốt</span>
                        <br />
                        <span>{{ hotel.review_count ?? 0 }} đánh giá</span>
                      </div>
                      <div class="point">
                        {{ hotel.avg_rating ?? '—' }}
                      </div>
                    </div>
                  </div>
                  <div class="inner-infor">
                    <div class="information">
                      <span class="title">Phòng tiêu chuẩn giường đôi</span>
                      <br />
                      <span> 1 giường đôi</span>
                      <br />
                      <span class="desc" v-if="hotel.has_free_cancellation">
                        <i class="fa-solid fa-check"></i> Miễn phí hủy
                      </span>
                      <br />
                      <span class="desc"
                        ><i class="fa-solid fa-check"></i> Không cần thanh toán trước -
                      </span>
                      <span class="desc">Thanh toán tại chỗ nghỉ</span>
                      <br />
                      <p class="last">Chỉ còn 4 phòng với giá này trên trang chúng tôi</p>
                    </div>
                    <div class="price">
                      <span class="people"
                        >{{ getSearchData?.numberOfDays || 2 }} đêm,
                        {{ getSearchData?.adults || 2 }} người lớn</span
                      >
                      <br />
                      <span class="newPrice">
                        USD
                        {{ (hotel.min_price_for_dates ?? 0).toLocaleString('en-US') }}
                      </span>
                      <br />
                      <span class="desc">Đã bao gồm thuế và phí</span>
                      <button>Xem chỗ trống</button>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="showPagination" class="pagination-wrapper">
                <p class="pagination-summary">
                  Hiển thị {{ currentResultStart }}-{{ currentResultEnd }} trong
                  {{ totalResults }} chỗ nghỉ
                </p>
                <nav class="pagination" aria-label="Search results pagination">
                  <button
                    type="button"
                    class="pagination-button"
                    :disabled="pagination.page <= 1 || isLoading"
                    @click="changePage(pagination.page - 1)"
                  >
                    Trước
                  </button>

                  <template v-for="page in pageNumbers" :key="page">
                    <span v-if="typeof page === 'string'" class="pagination-ellipsis">...</span>
                    <button
                      v-else
                      type="button"
                      class="pagination-button page-number"
                      :class="{ active: page === pagination.page }"
                      :aria-current="page === pagination.page ? 'page' : null"
                      :disabled="isLoading"
                      @click="changePage(page)"
                    >
                      {{ page }}
                    </button>
                  </template>

                  <button
                    type="button"
                    class="pagination-button"
                    :disabled="pagination.page >= pagination.totalPages || isLoading"
                    @click="changePage(pagination.page + 1)"
                  >
                    Sau
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <TheFooter />
</template>
<style scoped>
  /* searchInfor */
  .inforSearch {
    margin-bottom: 50px;
  }

  .container {
    position: relative;
  }

  .search-container {
    background-color: #ffc107;
    padding: 20px;
    border-radius: 8px;
    /* width: 300px; */
    margin: 0 auto;
  }

  .search-container h2 {
    text-align: center;
    color: #fff;
  }

  label {
    font-weight: bold;
    display: block;
    margin: 10px 0 5px;
  }

  input[type='text'],
  input[type='date'] {
    width: 100%;
    padding: 8px;
    margin-bottom: 10px;
    border-radius: 4px;
    border: 1px solid #ccc;
  }

  .guest-room {
    position: relative;
  }

  .guest-room-dropdown {
    display: none;
    position: absolute;
    background-color: #fff;
    border: 1px solid #ccc;
    width: 100%;
    top: 40px;
    padding: 10px;
    box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
  }

  #guest-infor {
    width: 100%;
  }

  .guest-room-dropdown label {
    display: inline-block;
    margin-right: 10px;
  }

  button {
    padding: 5px 10px;
    margin: 5px;
  }

  #search-btn {
    width: 100%;
    padding: 10px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  #search-btn:hover {
    background-color: #0056b3;
  }

  .box {
    display: flex;
    justify-content: space-between;
    padding: 0 10px;
  }

  .minus,
  .add {
    border: 1px solid #007bff;
    border-radius: 5px;
    background-color: #fff;
    height: 30px;
    display: flex;
    align-items: center;
    margin: 0 10px;
  }

  .box div {
    display: flex;
    align-items: center;
  }

  .closeButton {
    border: 1px solid #007bff;
    border-radius: 5px;
    background-color: #fff;
    width: 100%;
    color: #007bff;
  }

  .closeButton:hover {
    background-color: #007bff;
    color: #fff;
  }

  /* end searchInfor */

  /* map */
  .map {
    margin: 10px 0;
    /* width: 300px; */
    height: 150px;
    border-radius: 5px;
    overflow: hidden;
  }

  iframe {
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 10px;
  }

  .map-button {
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: #0066cc;
    color: white;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
    top: -60px;
    margin: auto;
    position: relative;
  }

  .map-button:hover {
    background-color: #0052a3;
  }

  .map-icon {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  /* end map */

  /* select */
  .search-select {
    border-radius: 8px;
    border: 1px solid #ddd;
    /* width: 300px; */
  }

  .budget-container {
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    border-bottom: 1px solid #ddd;
    text-align: center;
  }

  .toggle-buttons {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .toggle-buttons button {
    padding: 10px 20px;
    border: none;
    background-color: #f0f0f0;
    border-radius: 20px;
    cursor: pointer;
    font-weight: bold;
  }

  .toggle-buttons .active {
    background-color: #007bff;
    color: white;
  }

  .budget-range {
    margin-top: 20px;
  }

  .range-slider {
    position: relative;
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .range-slider input[type='range'] {
    width: 100%;
    position: absolute;
    background: transparent;
    pointer-events: none;
    top: 50%;
    /* Căn giữa dọc */
    transform: translateY(-50%);
    /* Giúp căn đều chấm tròn với thanh ngang */
  }

  input[type='range']::-webkit-slider-runnable-track {
    height: 8px;
    /* Tăng chiều cao của thanh trượt để cân bằng với chấm tròn */
    background: #007bff;
    border-radius: 5px;
    pointer-events: none;
  }

  input[type='range']::-webkit-slider-thumb {
    pointer-events: all;
    width: 18px;
    height: 18px;
    background: #007bff;
    border-radius: 50%;
    cursor: pointer;
    -webkit-appearance: none;
    position: relative;
    top: 50%;
    /* Căn chỉnh chấm tròn với thanh trượt */
    transform: translateY(-50%);
    /* Đảm bảo nó ở giữa thanh trượt */
  }

  input[type='range']::-moz-range-thumb {
    pointer-events: all;
    width: 18px;
    height: 18px;
    background: #007bff;
    border-radius: 50%;
    cursor: pointer;
    position: relative;
    top: 50%;
    /* Căn chỉnh chấm tròn với thanh trượt */
    transform: translateY(-50%);
    /* Đảm bảo nó ở giữa thanh trượt */
  }

  input[type='range']::-moz-range-track {
    height: 8px;
    background: #007bff;
    border-radius: 5px;
  }

  /* end select */

  /* content  */
  .inner-content {
    flex: 1;
    padding: 10px 20px;
  }

  .arrange {
    display: flex;
    justify-content: space-between;
  }

  .arrange select {
    border-radius: 20px;
    padding: 5px;
  }

  .inner-content .arrange {
    margin-top: 10px;
    display: flex;
    align-items: center;
    margin-bottom: 20px;
  }

  .inner-content .arrange i {
    color: #ddd;
    margin-right: 8px;
  }

  .inner-content .arrange span {
    margin-right: 8px;
  }

  .type-search {
    display: flex;
    align-items: center;
  }

  .type-search input {
    margin: 0px;
    border: none;
    border-radius: 20px;
    padding: 5px;
    border: #ccc 1px solid;
    width: 250px;
  }

  .type-search button {
    background-color: #007bff;
    border: none;
    cursor: pointer;
    border-radius: 20px;
  }

  /* end content  */

  .checkbox {
    display: flex;
    justify-content: space-between;
    padding: 5px 20px;
  }

  .amount {
    flex: 1;
    text-align: right;
  }

  .popular-select strong {
    margin-left: 5px;
  }

  /* room  */
  .room-infor {
    height: 258px;
    display: flex;
    padding: 10px;
    justify-content: space-between;
    border: 1px solid #c7c7cc;
    border-radius: 8px;
    align-items: center;
    margin-bottom: 10px;
    cursor: pointer;
  }

  .room-infor .inner-img {
    position: relative;
    width: 31%;
    height: 100%;
  }

  .room-infor .inner-img img {
    width: 100%;
    height: 100%;
    border-radius: 5px;
  }

  .room-infor .inner-show {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 0 20px;
  }

  .inner-show {
    height: -webkit-fill-available;
    justify-content: space-between;
  }

  .hotel-name {
    color: #003b95;
    font-size: 24px;
  }

  .hotel-name:hover {
    color: black;
  }

  .room-infor .inner-introduction {
    display: flex;
    justify-content: space-between;
  }

  .room-infor .inner-review {
    display: flex;
    text-align: right;
    justify-content: space-between;
  }

  .room-infor .point {
    border: 1px solid #003b95;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 5px 5px 5px 0;
    margin-left: 15px;
    color: #fff;
    font-weight: 600;
    background-color: #003b95;
  }

  .room-infor .award span:first-child {
    font-weight: 600;
  }

  .room-infor .award span:last-child {
    font-size: 12px;
    text-wrap: nowrap;
  }

  .room-infor .inner-name .no {
    border: 1px solid #0056b3;
    padding: 5px;
    border-radius: 5px;
    font-size: 12px;
  }

  .room-infor .inner-name .location {
    display: inline-block;
    margin-top: 3px;
    font-size: 12px;
  }

  .room-infor .inner-infor {
    display: flex;
    justify-content: space-between;
  }

  .room-infor .inner-infor .information {
    width: 70%;
    font-size: 12px;
    border-left: 1px solid #ddd;
    padding-left: 10px;
  }

  .room-infor .inner-infor .price {
    flex: 1;
  }

  .room-infor .inner-infor .information .title {
    font-weight: bold;
    font-size: 16px;
  }

  .room-infor .inner-infor .information .desc {
    color: green;
    font-weight: 600;
  }

  .room-infor .inner-infor .information .last {
    font-size: 13px;
    margin-top: 5px;
    font-weight: bold;
    color: red;
  }

  .room-infor .inner-infor .price {
    font-size: 12px;
    text-align: right;
  }

  .room-infor .inner-infor .oldPrice {
    color: red;
    font-size: 15px;
    text-decoration: line-through;
  }

  .room-infor .inner-infor .newPrice {
    font-size: 18px;
    font-weight: 500;
  }

  .room-infor .inner-infor button {
    border: none;
    color: #fff;
    font-weight: bold;
    background-color: #007bff;
    padding: 10px;
    border-radius: 5px;
  }

  .room-infor .inner-infor button:hover {
    background-color: #003b95;
  }

  .address-container {
    display: flex;
  }

  .pagination-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 24px 0 8px;
    padding: 16px 0;
    border-top: 1px solid #e6e6e6;
  }

  .pagination-summary {
    margin: 0;
    color: #595959;
    font-size: 14px;
  }

  .pagination {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .pagination-button {
    min-width: 38px;
    height: 38px;
    margin: 0;
    border: 1px solid #006ce4;
    border-radius: 4px;
    background-color: #fff;
    color: #006ce4;
    font-weight: 600;
    cursor: pointer;
  }

  .pagination-button:hover:not(:disabled),
  .pagination-button.active {
    background-color: #003b95;
    border-color: #003b95;
    color: #fff;
  }

  .pagination-button:disabled {
    border-color: #d9d9d9;
    color: #999;
    cursor: not-allowed;
  }

  .pagination-ellipsis {
    min-width: 24px;
    text-align: center;
    color: #595959;
  }
  /* end room  */

  /* loading */
  .vl-parent {
    position: relative;
    height: 100%;
    width: 100%;
  }
</style>
