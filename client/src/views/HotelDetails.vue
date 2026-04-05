<script>
  import TheHeader from '@/components/Header.vue';
  import TheFooter from '@/components/Footer.vue';
  import MapComponent from '@/components/map/MapComponent.vue';
  import { mapActions, mapGetters } from 'vuex';
  import ImageGallery from '@/components/hotel-image/ImageGallery.vue';
  import { useToast } from 'vue-toastification';
  import Loading from 'vue-loading-overlay';
  import 'vue-loading-overlay/dist/css/index.css';

  import ReviewValidation from '@/components/review/ReviewValidation.vue';
  import errorHandler from '@/request/errorHandler';
  import { HotelService } from '@/services/hotel.service';

  // New child components
  import HotelHeader from '@/components/hotel-details/HotelHeader.vue';
  import HotelImages from '@/components/hotel-details/HotelImages.vue';
  import HotelInformation from '@/components/hotel-details/HotelInformation.vue';
  import HotelMap from '@/components/hotel-details/HotelMap.vue';
  import RoomSearchBar from '@/components/hotel-details/RoomSearchBar.vue';
  import RoomList from '@/components/hotel-details/RoomList.vue';
  import ReviewSection from '@/components/hotel-details/ReviewSection.vue';
  import ReviewPopup from '@/components/hotel-details/ReviewPopup.vue';
  import NearbyPlaces from '@/components/hotel-details/NearbyPlaces.vue';
  import HotelPolicies from '@/components/hotel-details/HotelPolicies.vue';

  export default {
    name: 'HotelDetails',
    components: {
      TheHeader,
      TheFooter,
      MapComponent,
      ImageGallery,
      Loading,
      ReviewValidation,
      // New child components
      HotelHeader,
      HotelImages,
      HotelInformation,
      HotelMap,
      RoomSearchBar,
      RoomList,
      ReviewSection,
      ReviewPopup,
      NearbyPlaces,
      HotelPolicies,
    },
    setup() {
      const toast = useToast();
      return { toast };
    },
    data() {
      return {
        hotel_id: null,

        // Hotel data
        hotel: {},
        checkInOut: {},
        amenities: {},
        ratingSummary: null,
        ratingBreakdown: {},
        policies: [],
        room_list: [],
        reviews: [],
        nearbyPlaces: [],

        // Image gallery
        hotelImages: [],
        initialThumbnailCount: 4,
        isImageGalleryOpen: false,

        // Search parameters
        dateRange: null,
        numberOfGuests: 2,
        numberOfRooms: 1,
        checkInDate: null,
        checkOutDate: null,
        numberOfDays: null,

        // Selected rooms for booking
        selectedRooms: [],

        // UI state
        openCommentPopup: false,
        openMapPopup: false,
        showReviewValidation: false,
        isSearchRoomLoading: false,
        isLoadingHotelDetails: false,
      };
    },
    computed: {
      ...mapGetters('auth', ['isUserAuthenticated']),
      ...mapGetters('search', ['getSearchData']),
    },

    async mounted() {
      if (this.getSearchData) {
        this.checkOutDate = this.getSearchData.checkOutDate;
        this.selectedLocation = this.getSearchData.location;

        if (this.getSearchData.checkInDate && this.getSearchData.checkOutDate) {
          let checkInDate = new Date(this.getSearchData.checkInDate).toLocaleDateString('vi-VN');
          let checkOutDate = new Date(this.getSearchData.checkOutDate).toLocaleDateString('vi-VN');

          if (new Date(this.getSearchData.checkInDate).getTime() < new Date().getTime()) {
            checkInDate = new Date().toLocaleDateString('vi-VN');
          }
          if (new Date(this.getSearchData.checkOutDate).getTime() < new Date().getTime()) {
            checkOutDate = new Date(new Date().getTime() + 1000 * 60 * 60 * 24).toLocaleDateString(
              'vi-VN'
            );
          }

          this.dateRange =
            this.$t('userHeader.dateInputPlaceholder_1') +
            ' ' +
            checkInDate +
            ' ' +
            this.$t('userHeader.dateInputPlaceholder_2') +
            ' ' +
            checkOutDate;
        }

        this.numberOfRooms = this.getSearchData.rooms || 1;
        this.numberOfDays = this.getSearchData.numberOfDays;
        this.checkInDate = this.getSearchData.checkInDate;
      }

      console.log('mounted');
      this.hotel_id = this.$route.params.hotel_id;
      await this.getHotelDetails();
    },

    methods: {
      ...mapActions('book', ['booking', 'checkRoomAvailability']),
      ...mapActions('search', [
        'updateCheckInDate',
        'updateCheckOutDate',
        'updateNumberOfDays',
        'updateRooms',
      ]),

      calculateNumberOfDays(checkInDateString, checkOutDateString) {
        const checkInDate = new Date(checkInDateString);
        const checkOutDate = new Date(checkOutDateString);
        const timeDifference = checkOutDate - checkInDate;
        this.numberOfDays = timeDifference / (1000 * 60 * 60 * 24) + 1;
      },

      extractDate() {
        const dateRegex = /\b(\d{2}\/\d{2}\/\d{4})\b/g;
        const dates = this.dateRange.match(dateRegex);
        if (dates) {
          for (let i = 0; i < dates.length; i++) {
            const [day, month, year] = dates[i].split('/');
            dates[i] = `${year}-${month}-${day}`;
          }
          this.checkInDate = dates[0];
          this.checkOutDate = dates[1];
          this.calculateNumberOfDays(this.checkInDate, this.checkOutDate);
        }
      },

      async getHotelDetails() {
        console.log('getHotelDetails');
        try {
          this.isLoadingHotelDetails = true;

          const params = {
            checkInDate: this.getSearchData.checkInDate,
            checkOutDate: this.getSearchData.checkOutDate,
            numberOfRooms: this.getSearchData.rooms || this.numberOfRooms,
            numberOfGuests: this.numberOfGuests,
          };

          const response = await HotelService.getHotelDetails(this.$route.params.hotel_id, params);
          const data = response.data;

          this.hotel = data.hotel;
          this.checkInOut = data.checkInOut || {};
          this.hotelImages = data.images || [];
          this.amenities = data.amenities || {};
          this.ratingSummary = data.ratingSummary;
          this.ratingBreakdown = data.ratingBreakdown || {};
          this.room_list = data.rooms || [];
          this.reviews = data.reviews || [];
          this.nearbyPlaces = data.nearbyPlaces || [];
          this.policies = data.policies || [];
        } catch (error) {
          errorHandler(error);
        } finally {
          this.isLoadingHotelDetails = false;
        }
      },

      async applyChange(searchData) {
        try {
          this.isSearchRoomLoading = true;

          // Use the search data passed from RoomSearchBar
          if (searchData && searchData.dateRange) {
            this.dateRange = searchData.dateRange;
          }

          this.extractDate(this.dateRange);

          const params = {
            checkInDate: this.checkInDate,
            checkOutDate: this.checkOutDate,
            numberOfRooms: searchData?.numberOfRooms || this.numberOfRooms,
            numberOfGuests: searchData?.numberOfGuests || this.numberOfGuests,
          };

          const response = await HotelService.searchAvailableRooms(this.hotel_id, params);
          this.updateSearchDataInStore();
          this.room_list = response.data || [];
        } catch (error) {
          errorHandler(error);
        } finally {
          this.isSearchRoomLoading = false;
        }
      },

      async processBooking() {
        if (this.selectedRooms.length != 0) {
          const bookingInfor = {
            hotel: {
              hotel_id: this.hotel_id,
              name: this.hotel.name,
              address: this.hotel.address,
              overall_rating: this.ratingSummary?.overallRating || 0,
              check_in_time: this.checkInOut.checkInTime,
              check_out_time: this.checkInOut.checkOutTime,
            },
            totalPrice: this.selectedRooms.reduce((sum, r) => sum + r.totalPrice, 0),
            totalRooms: this.selectedRooms.reduce((sum, r) => sum + r.roomQuantity, 0),
            selectedRooms: this.selectedRooms,
            numberOfGuests: this.numberOfGuests,
            checkInDate: this.getSearchData.checkInDate,
            checkOutDate: this.getSearchData.checkOutDate,
            numberOfDays: this.getSearchData.numberOfDays,
          };

          this.booking(bookingInfor);

          const isAvailable = await this.checkRoomAvailability();
          if (!isAvailable) {
            this.toast.error('Phòng đã được đặt hết, vui lòng chọn phòng khác!');
            return;
          } else {
            this.$router.push('/book');
          }
        }
      },

      writeReview() {
        if (this.isUserAuthenticated) {
          this.showReviewValidation = true;
        } else {
          this.$router.push({ path: '/login', query: { redirect: this.$route.path } });
        }
      },

      updateSearchDataInStore() {
        this.updateCheckInDate(this.checkInDate);
        this.updateCheckOutDate(this.checkOutDate);
        this.updateNumberOfDays(this.numberOfDays);
        this.updateRooms(this.numberOfRooms);
      },

      // UI handlers
      openImageGallery() {
        this.isImageGalleryOpen = true;
        document.body.style.overflow = 'hidden';
      },

      closeImageGallery() {
        this.isImageGalleryOpen = false;
        document.body.style.overflow = '';
      },

      showCommentPopup() {
        this.openCommentPopup = true;
      },

      closeReviewValidation() {
        this.showReviewValidation = false;
      },

      scrollToRooms() {
        const roomsSection = document.getElementById('price');
        if (roomsSection) {
          roomsSection.scrollIntoView({ behavior: 'smooth' });
        }
      },
    },
  };
</script>

<template>
  <div id="hotelDetails" class="hotel-details-container">
    <TheHeader :is-search-open="true" />

    <!-- Map Popup -->
    <MapComponent v-if="openMapPopup" :hotels="[hotel]" @close-map-popup="openMapPopup = false" />

    <!-- Image Gallery -->
    <ImageGallery
      :room_list="room_list"
      :hotel-images="hotelImages"
      :is-open-image-gallery="isImageGalleryOpen"
      @close-image-gallery="closeImageGallery"
    />

    <!-- Review Validation -->
    <ReviewValidation
      v-if="showReviewValidation"
      :hotel-id="hotel_id"
      :hotel-name="hotel.name"
      @close="closeReviewValidation"
    />

    <!-- Review Popup -->
    <ReviewPopup
      :is-open="openCommentPopup"
      :rating-summary="ratingSummary"
      :rating-breakdown="ratingBreakdown"
      :reviews="reviews"
      @close="openCommentPopup = false"
      @write-review="writeReview"
    />

    <!-- Menu -->
    <div class="menu">
      <div class="container">
        <div class="menu__list">
          <ul>
            <li><a href="">Tổng quan</a></li>
            <li><a href="#price">Thông tin & giá</a></li>
            <li>Tiện nghi</li>
            <li><a href="#policy">Chính sách</a></li>
            <li>Ghi chú</li>
            <li><a href="#review">Đánh giá của khách</a></li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Overview Section -->
    <div class="overview">
      <div class="container">
        <div class="overview__total">
          <div class="overview__image">
            <HotelHeader :hotel="hotel" @book="scrollToRooms" />
            <HotelImages
              :hotel-images="hotelImages"
              :initial-thumbnail-count="initialThumbnailCount"
              @open-gallery="openImageGallery"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Information Section -->
    <div class="information">
      <div class="container">
        <div class="information__total">
          <HotelInformation :description="hotel.description" :amenities="amenities" />
          <HotelMap
            :latitude="hotel.latitude"
            :longitude="hotel.longitude"
            @show-map="openMapPopup = true"
          />
        </div>
        <hr />
      </div>
    </div>

    <!-- Search Bar -->
    <div class="search container">
      <RoomSearchBar
        v-model:number-of-guests="numberOfGuests"
        v-model:number-of-rooms="numberOfRooms"
        :date-range="dateRange"
        :is-loading="isSearchRoomLoading"
        @search="applyChange"
      />
    </div>

    <!-- Room List -->
    <div id="price" class="container">
      <RoomList v-model:selected-rooms="selectedRooms" :rooms="room_list" @book="processBooking" />
      <Loading v-model:active="isSearchRoomLoading" :color="`#003b95`" :is-full-page="false" />
    </div>

    <!-- Reviews Section -->
    <div id="review" class="review">
      <div class="container">
        <div class="review__total">
          <ReviewSection
            :rating-summary="ratingSummary"
            :rating-breakdown="ratingBreakdown"
            :reviews="reviews"
            @view-rooms="scrollToRooms"
            @show-all-reviews="showCommentPopup"
          />
        </div>
      </div>
    </div>

    <!-- Nearby Places -->
    <div class="surrounding">
      <div class="container">
        <div class="surrounding__total">
          <NearbyPlaces
            :nearby-places="nearbyPlaces"
            @show-map="openMapPopup = true"
            @view-rooms="scrollToRooms"
          />
        </div>
      </div>
    </div>

    <!-- Policies -->
    <div id="policy" class="policy">
      <div class="container">
        <div class="policy__total">
          <HotelPolicies :hotel-name="hotel.name" :policies="policies" @view-rooms="scrollToRooms" />
        </div>
      </div>
    </div>

    <TheFooter />
  </div>
</template>

<style scoped>
  .hotel-details-container {
    overflow-x: hidden;
    width: 100vw;
    min-height: 100vh;
  }

  /* Menu */
  .menu__list {
    margin: 20px 0;
    border-bottom: 1px solid #777;
  }

  .menu__list ul {
    display: flex;
    list-style-type: none;
    font-size: 18px;
    font-weight: 400;
    color: #000;
    margin-bottom: 0;
    padding: 0;
  }

  .menu__list ul li {
    cursor: pointer;
    width: 16.67%;
    text-align: center;
    padding: 15px 0;
  }

  .menu__list ul li:hover {
    background-color: #f0f6fd;
  }

  .menu__list ul li:first-child {
    border-bottom: 2px solid #23ace3;
  }

  /* Overview */
  .overview {
    margin-bottom: 10px;
  }

  .overview__total {
    display: flex;
    align-items: center;
  }

  .overview__image {
    flex: 1;
    height: 100%;
  }

  /* Information */
  .information {
    margin-bottom: 20px;
  }

  .information__total {
    display: flex;
  }

  /* Search */
  .search {
    margin-bottom: 20px;
  }

  /* Review */
  .review {
    margin-top: 20px;
  }

  /* Surrounding */
  .surrounding__total {
    margin-top: 40px;
  }

  /* Policy */
  .policy {
    margin: 40px 0px;
  }
</style>
