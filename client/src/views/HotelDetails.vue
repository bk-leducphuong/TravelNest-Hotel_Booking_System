<script>
  import TheHeader from '@/components/Header.vue';
  import TheFooter from '@/components/Footer.vue';
  import MapComponent from '@/components/map/MapComponent.vue';
  import { mapActions, mapGetters } from 'vuex';
  import ImageGallery from '@/components/hotel-image/ImageGallery.vue';
  import { useToast } from 'vue-toastification';
  import EmptyState from '@/components/common/EmptyState.vue';
  import { HotelService } from '@/services/hotel.service';
  import { ReviewService } from '@/services/review.service';
  import { getImagePath, getImageUrl } from '@/utils/images';
  import defaultAvatarImg from '@/assets/avatar/default_avatar.png';

  // import ReviewForm from '@/components/review/ReviewForm.vue'
  import ReviewValidation from '@/components/review/ReviewValidation.vue';

  import errorHandler from '@/request/errorHandler';
  import { HoldService } from '@/services/hold.service';
  import { stayNights, formatStayDate } from '@/utils/stay';
  import { guestMoney } from '@/utils/guestPresentation';
  import MediaImage from '@/components/ui/MediaImage.vue';

  export default {
    components: {
      MediaImage,
      TheHeader,
      TheFooter,
      MapComponent,
      ImageGallery,
      EmptyState,
      // ReviewForm,
      ReviewValidation,
    },
    setup() {
      // Get toast interface
      const toast = useToast();
      // Make it available inside methods
      return { toast };
    },
    data() {
      return {
        hotel_id: null,
        detailsLoading: false,
        detailsError: '',
        detailVersion: 0,
        roomVersion: 0,
        roomSearchScope: '',
        hotelAmenities: [],
        hotelPolicies: [],
        checkInOut: {},
        bookingPending: false,
        roomError: '',
        reviewsError: '',
        reviewVersion: 0,

        // image gallery
        hotelImages: [],
        initialThumbnailCount: 4,

        // hotel details
        hotel: {},
        room_list: [],
        reviews: [],
        reviewsTotal: 0,
        nearbyPlaces: [],
        reviewCriterias: [],

        // guest review panel (fetched separately so it can be filtered/paginated)
        popupReviews: [],
        reviewsLoading: false,
        reviewFilters: {
          score: '',
          season: '',
          country: '',
          hasMedia: false,
          q: '',
        },
        reviewCountries: [],
        reviewPagination: { page: 1, limit: 5, total: 0, totalPages: 0 },

        // selected rooms for booking
        selectedRooms: [],

        // popup
        openCommentPopup: false,
        openMapPopup: false,
        isImageGalleryOpen: false,
        showGuestSelector: false,
        showReviewForm: false,
        showReviewValidation: false,
        // search room
        isSearchRoomLoading: false,
      };
    },
    watch: {
      '$route.params.hotel_id': {
        immediate: true,
        handler(value) {
          this.hotel_id = value;
          this.selectedRooms = [];
          this.roomVersion++;
          this.reviewVersion++;
          this.isSearchRoomLoading = false;
          this.openCommentPopup = false;
          this.roomError = '';
          this.getHotelDetails();
        },
      },
      searchScope() {
        this.selectedRooms = [];
      },
    },
    beforeUnmount() {
      this.detailVersion++;
      this.roomVersion++;
      this.reviewVersion++;
    },
    computed: {
      searchScope() {
        return JSON.stringify([
          this.getSearchData.checkInDate,
          this.getSearchData.checkOutDate,
          this.totalGuests,
          this.rooms,
        ]);
      },
      nights() {
        return stayNights(this.getSearchData.checkInDate, this.getSearchData.checkOutDate);
      },
      currentRooms() {
        return this.nights > 0 && this.roomSearchScope === this.searchScope;
      },
      hasLocation() {
        return (
          this.hotel.latitude != null &&
          this.hotel.longitude != null &&
          Number.isFinite(Number(this.hotel.latitude)) &&
          Number.isFinite(Number(this.hotel.longitude))
        );
      },
      ...mapGetters('auth', ['isUserAuthenticated', 'getUserId']),
      ...mapGetters('search', ['getSearchData']),
      // The search bar shares the Vuex `search` store with the header's main
      // search bar, so edits in either place stay in sync.
      adults: {
        get() {
          return this.toCount(this.getSearchData.adults, 1);
        },
        set(value) {
          this.updateAdults(this.toCount(value, 1));
        },
      },
      children: {
        get() {
          return this.toCount(this.getSearchData.children, 0);
        },
        set(value) {
          this.updateChildren(this.toCount(value, 0));
        },
      },
      rooms: {
        get() {
          return this.toCount(this.getSearchData.rooms, 1);
        },
        set(value) {
          this.updateRooms(this.toCount(value, 1));
        },
      },
      dateRange: {
        get() {
          const { checkInDate, checkOutDate } = this.getSearchData;
          return checkInDate && checkOutDate ? [checkInDate, checkOutDate] : null;
        },
        set(value) {
          if (Array.isArray(value) && value[0] && value[1]) {
            this.updateCheckInDate(value[0]);
            this.updateCheckOutDate(value[1]);
            this.updateNumberOfDays(this.calculateNumberOfDays(value[0], value[1]));
          } else {
            this.updateCheckInDate(null);
            this.updateCheckOutDate(null);
            this.updateNumberOfDays(null);
          }
        },
      },
      guestDetails() {
        return (
          `${this.adults} ` +
          this.$t('userHeader.guestInputPlaceholder_1') +
          ` · ${this.children} ` +
          this.$t('userHeader.guestInputPlaceholder_2') +
          ` · ${this.rooms} ` +
          this.$t('userHeader.guestInputPlaceholder_3')
        );
      },
      totalGuests() {
        return this.toCount(this.adults, 1) + this.toCount(this.children, 0);
      },
      displayedThumbnails() {
        return this.hotelImages.slice(3, 3 + this.initialThumbnailCount);
      },
      hasMoreImages() {
        return !this.showAll && this.hotelImages.length > 3 + this.initialThumbnailCount;
      },
      remainingImages() {
        return this.hotelImages.length - (3 + this.initialThumbnailCount);
      },
      // The preview section always shows the top 3 most recent reviews.
      topReviews() {
        return this.reviews.slice(0, 3);
      },
      // Total number of published reviews, from the hotel rating summary when
      // available (the embedded list is capped).
      totalReviewCount() {
        return this.reviewsTotal || this.reviews.length;
      },
      hasActiveReviewFilters() {
        const f = this.reviewFilters;
        return Boolean(f.score || f.season || f.country || f.hasMedia || f.q);
      },
      // Fallback avatar for reviewers without a profile picture (an empty `src`
      // resolves to the page URL and renders a broken image).
      defaultAvatar() {
        return defaultAvatarImg;
      },
      // Map the 0-10 overall rating to the same labels used by the search
      // filters, instead of always showing "Tuyệt hảo" regardless of the score.
      overallRatingLabel() {
        const rating = Number(this.hotel.overall_rating) || 0;
        if (rating >= 9) return this.$t('hotelDetails.rating.excellent');
        if (rating >= 8) return this.$t('hotelDetails.rating.veryGood');
        if (rating >= 7) return this.$t('hotelDetails.rating.good');
        if (rating >= 6) return this.$t('hotelDetails.rating.pleasant');
        if (rating > 0) return this.$t('hotelDetails.rating.acceptable');
        return this.$t('hotelDetails.rating.noRating');
      },
      // calculate total number and total price of selected rooms
      totalSelectedRooms() {
        return this.selectedRooms.reduce((total, option) => total + option.roomQuantity, 0);
      },
      totalPriceSelectedRooms() {
        return this.selectedRooms.reduce((total, option) => total + option.totalPrice, 0);
      },
    },
    methods: {
      guestMoney,
      formatStayDate,
      ...mapActions('book', ['booking', 'checkRoomAvailability']),
      ...mapActions('search', [
        'updateCheckInDate',
        'updateCheckOutDate',
        'updateNumberOfDays',
        'updateAdults',
        'updateRooms',
        'updateChildren',
      ]),
      calculateNumberOfDays(checkInDateString, checkOutDateString) {
        return stayNights(checkInDateString, checkOutDateString);
      },
      // Prevent selecting check-in dates in the past, matching the header bar.
      disabledDate(time) {
        return time.getTime() < Date.now() - 8.64e7;
      },
      toArray(value) {
        if (Array.isArray(value)) return value;
        if (typeof value !== 'string') return [];

        try {
          const parsed = JSON.parse(value || '[]');
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      },
      toCount(value, fallback = 0) {
        const count = parseInt(value, 10);
        return Number.isFinite(count) ? count : fallback;
      },
      normalizeRoom(room) {
        const roomAmenities = this.toArray(room.roomAmenities)
          .map((amenity) => (typeof amenity === 'string' ? amenity : amenity.name))
          .filter(Boolean);
        const roomImageUrls = this.toArray(room.roomImageUrls)
          .map((image) => (typeof image === 'string' ? image : image.object_key || image.url))
          .filter(Boolean);

        return {
          ...room,
          room_id: room.roomId || room.room_id,
          room_name: room.roomName || room.room_name,
          room_amenities: JSON.stringify(roomAmenities),
          room_image_urls: JSON.stringify(roomImageUrls),
          max_guests: room.maxGuests ?? room.max_guests,
          price_per_night: room.pricePerNight ?? room.price_per_night,
          available_rooms: room.availableRooms ?? room.available_rooms,
        };
      },
      // Reviews arrive in two shapes: the embedded hotel-details payload is
      // camelCase, the paginated /reviews/hotels/:id endpoint returns raw rows
      // (snake_case). Normalise both to one shape for the template.
      normalizeReview(review) {
        const user = review.user || {};
        const profilePicture = user.profilePictureUrl ?? user.profile_picture_url;
        const country = user.country ?? review.country ?? null;

        return {
          ...review,
          review_id: review.id ?? review.review_id,
          profile_picture_url: getImageUrl(profilePicture),
          username:
            user.firstName ??
            user.first_name ??
            review.username ??
            this.$t('hotelDetails.reviews.guestFallback'),
          author_id: user.id ?? review.user_id ?? null,
          country,
          created_at: review.createdAt ?? review.created_at,
          rating: Number(review.ratingOverall ?? review.rating_overall ?? review.rating) || 0,
          title: review.title || '',
          comment: review.comment || '',
          is_verified: Boolean(review.isVerified ?? review.is_verified),
          helpful_count: Number(review.helpfulCount ?? review.helpful_count) || 0,
          // null = not voted, true/false = the viewer's vote (when authenticated).
          viewer_vote: review.viewerHelpfulVote ?? review.viewer_helpful_vote ?? null,
          media: this.normalizeReviewMedia(review.media),
          reply: this.normalizeReviewReply(review.reply),
        };
      },
      normalizeReviewMedia(media) {
        const list = Array.isArray(media) ? media : this.toArray(media);

        return list
          .map((item) => {
            if (!item) return null;
            if (typeof item === 'string') {
              return { id: item, url: getImageUrl(item), thumbnail_url: getImageUrl(item) };
            }

            const url = item.thumbnailUrl ?? item.thumbnail_url ?? item.url ?? item.media_url;
            return {
              id: item.id ?? url,
              url: getImageUrl(item.url ?? item.media_url ?? item.thumbnail_url),
              thumbnail_url: getImageUrl(url),
            };
          })
          .filter((item) => item && item.url);
      },
      normalizeReviewReply(reply) {
        if (!reply) return null;
        const text = reply.comment ?? reply.reply_text ?? reply.text;
        if (!text) return null;

        return { comment: text, created_at: reply.createdAt ?? reply.created_at ?? null };
      },
      normalizeReviewCriterias(ratingBreakdown = {}) {
        const keys = ['cleanliness', 'location', 'service', 'valueForMoney', 'overall'];

        return keys
          .map((key) => {
            const score = Number(ratingBreakdown[key]);
            if (!Number.isFinite(score)) return null;

            return {
              criteria_key: `hotelDetails.criteria.${key}`,
              average_score: score / 2,
            };
          })
          .filter(Boolean);
      },
      normalizeNearbyPlace(place) {
        return {
          ...place,
          place_id: place.id,
          place_name: place.name,
          place_latitude: place.latitude,
          place_longitude: place.longitude,
        };
      },
      async getHotelDetails() {
        const version = ++this.detailVersion;
        const scope = this.searchScope;
        const roomVersion = this.roomVersion;
        this.detailsLoading = true;
        this.detailsError = '';
        this.hotel = {};
        this.room_list = [];
        this.hotelImages = [];
        this.hotelAmenities = [];
        this.hotelPolicies = [];
        this.reviews = [];
        try {
          const response = await HotelService.getHotelDetails(this.hotel_id, {
            checkInDate: this.getSearchData.checkInDate,
            checkOutDate: this.getSearchData.checkOutDate,
            numberOfNights: this.nights || undefined,
            numberOfRooms: this.toCount(this.rooms, 1),
            numberOfGuests: this.totalGuests,
          });
          if (version !== this.detailVersion) return;
          const details = response.data || {};
          const hotel = details.hotel || {};
          this.hotel = {
            ...hotel,
            hotel_id: hotel.id || hotel.hotel_id || this.hotel_id,
            hotel_class: hotel.hotelClass,
            image_urls: details.images || [],
            avg_rating: details.ratingSummary?.overallRating,
            review_count: details.ratingSummary?.totalReviews,
            latitude: hotel.lat ?? hotel.latitude,
            longitude: hotel.long ?? hotel.longitude,
            overall_rating:
              details.ratingSummary?.overallRating ?? details.ratingBreakdown?.overall ?? 0,
            check_in_time: details.checkInOut?.checkInTime,
            check_out_time: details.checkInOut?.checkOutTime,
          };
          this.checkInOut = details.checkInOut || {};
          this.hotelAmenities = details.amenities || [];
          this.hotelPolicies = details.policies || [];
          if (roomVersion === this.roomVersion) {
            this.room_list = (details.rooms || []).map(this.normalizeRoom);
            this.roomSearchScope = scope;
          }
          this.reviews = (details.reviews || []).map(this.normalizeReview);
          this.reviewsTotal = Number(details.ratingSummary?.totalReviews) || this.reviews.length;
          this.reviewCriterias = this.normalizeReviewCriterias(details.ratingBreakdown);
          this.nearbyPlaces = (details.nearbyPlaces || []).map(this.normalizeNearbyPlace);
          this.hotelImages = (details.images || [])
            .slice()
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
            .map((image) => getImageUrl(getImagePath(image)))
            .filter(Boolean);
        } catch (error) {
          if (version === this.detailVersion)
            this.detailsError =
              error.response?.status === 404 ? 'guest.hotelNotFound' : 'guest.loadFailed';
        } finally {
          if (version === this.detailVersion) this.detailsLoading = false;
        }
      },
      /******** comment popup *******/
      showCommentPopup() {
        this.openCommentPopup = true;
        this.fetchPopupReviews(1);
      },
      hideCommentPopup() {
        this.openCommentPopup = false;
      },
      // Build the query params for the paginated reviews endpoint from the
      // current filter state (empty values are omitted).
      reviewQueryParams(page) {
        const scoreBands = {
          excellent: { minRating: 9 },
          good: { minRating: 7, maxRating: 9 },
          average: { minRating: 5, maxRating: 7 },
          poor: { maxRating: 5 },
        };
        const monthsBySeason = {
          marMay: '3,4,5',
          junAug: '6,7,8',
          sepNov: '9,10,11',
          decFeb: '12,1,2',
        };
        const filters = this.reviewFilters;
        const band = scoreBands[filters.score] || {};

        const params = { page, limit: this.reviewPagination.limit };
        if (band.minRating !== undefined) params.minRating = band.minRating;
        if (band.maxRating !== undefined) params.maxRating = band.maxRating;
        if (monthsBySeason[filters.season]) params.months = monthsBySeason[filters.season];
        if (filters.country) params.country = filters.country;
        if (filters.hasMedia) params.hasMedia = true;
        if (filters.q.trim()) params.q = filters.q.trim();

        return params;
      },
      async fetchPopupReviews(page = 1) {
        const version = ++this.reviewVersion;
        this.reviewsLoading = true;
        this.reviewsError = '';
        try {
          const response = await ReviewService.getHotelReviews(
            this.hotel_id,
            this.reviewQueryParams(page)
          );
          if (version !== this.reviewVersion) return;
          const data = response?.data ?? [];
          const meta = response?.meta ?? {};

          this.popupReviews = data.map(this.normalizeReview);
          const limit = meta.limit ?? this.reviewPagination.limit;
          const total = meta.total ?? this.popupReviews.length;
          this.reviewPagination = {
            page: meta.page ?? page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
          };
          this.reviewCountries = meta.facets?.countries ?? [];
        } catch (error) {
          if (version === this.reviewVersion) this.reviewsError = this.$t('guest.loadFailed');
        } finally {
          if (version === this.reviewVersion) this.reviewsLoading = false;
        }
      },
      applyReviewFilters() {
        this.fetchPopupReviews(1);
      },
      clearReviewFilters() {
        this.reviewFilters = { score: '', season: '', country: '', hasMedia: false, q: '' };
        this.fetchPopupReviews(1);
      },
      goToReviewPage(page) {
        if (this.reviewsLoading) return;
        if (page < 1 || page > this.reviewPagination.totalPages) return;
        if (page === this.reviewPagination.page) return;
        this.fetchPopupReviews(page);
      },
      // Map a 1-10 review score to the shared rating labels.
      reviewRatingLabel(rating) {
        const score = Number(rating) || 0;
        if (score >= 9) return this.$t('hotelDetails.rating.excellent');
        if (score >= 8) return this.$t('hotelDetails.rating.veryGood');
        if (score >= 7) return this.$t('hotelDetails.rating.good');
        if (score >= 6) return this.$t('hotelDetails.rating.pleasant');
        if (score > 0) return this.$t('hotelDetails.rating.acceptable');
        return this.$t('hotelDetails.rating.noRating');
      },
      formatReviewDate(value) {
        if (!value) return '';
        return new Date(value).toLocaleDateString(this.$i18n.locale);
      },
      // Cast or retract the caller's helpful vote on a review. Requires an
      // account; guests are sent to login and returned here afterwards.
      async voteReview(review, isHelpful) {
        if (!this.isUserAuthenticated) {
          this.$router.push({ path: '/login', query: { redirect: this.$route.path } });
          return;
        }

        const index = this.popupReviews.findIndex((item) => item.review_id === review.review_id);
        if (index === -1) return;

        // Clicking the active vote retracts it.
        const retracting = this.popupReviews[index].viewer_vote === isHelpful;

        try {
          const response = retracting
            ? await ReviewService.removeReviewVote(review.review_id)
            : await ReviewService.voteReviewHelpful(review.review_id, isHelpful);

          const data = response?.data || {};
          this.popupReviews[index] = {
            ...this.popupReviews[index],
            viewer_vote: data.isHelpful ?? null,
            helpful_count: Number(data.helpfulCount) || 0,
          };
        } catch (error) {
          errorHandler(error);
        }
      },
      // Criteria scores are normalised to a 0-5 scale on the client.
      criteriaBarWidth(averageScore) {
        const score = Number(averageScore) || 0;
        return `${Math.max(0, Math.min(100, (score / 5) * 100))}%`;
      },
      /******** review popup *******/
      closeReviewValidation() {
        this.showReviewValidation = false;
      },
      /******** map popup ********/
      closeMapPopup() {
        this.openMapPopup = false;
      },
      /******** image gallery popup ********/
      openImageGallery() {
        this.isImageGalleryOpen = true;
        document.getElementById('hotelDetails').classList.add('no-scroll');
      },
      closeImageGallery() {
        this.isImageGalleryOpen = false;
        document.getElementById('hotelDetails').classList.remove('no-scroll');
      },
      /*********** guest selection popup *******/
      toggleGuestSelector() {
        this.showGuestSelector = !this.showGuestSelector;
      },
      updateGuests(type, action) {
        const increment = action === 'increment';
        if (type === 'adults') {
          if (increment && this.adults < 30) this.adults = this.adults + 1;
          else if (!increment && this.adults > 1) this.adults = this.adults - 1;
        } else if (type === 'children') {
          if (increment && this.children < 10) this.children = this.children + 1;
          else if (!increment && this.children > 0) this.children = this.children - 1;
        } else if (type === 'rooms') {
          if (increment && this.rooms < 30) this.rooms = this.rooms + 1;
          else if (!increment && this.rooms > 1) this.rooms = this.rooms - 1;
        }
      },
      hideGuestSelector() {
        this.showGuestSelector = false;
      },
      async applyChange() {
        if (!this.nights) {
          this.toast.error(this.$t('hotelDetails.search.datesRequired'));
          return;
        }
        const version = ++this.roomVersion;
        const scope = this.searchScope;
        this.selectedRooms = [];
        this.isSearchRoomLoading = true;
        this.roomError = '';
        try {
          const response = await HotelService.searchAvailableRooms(this.hotel_id, {
            checkInDate: this.getSearchData.checkInDate,
            checkOutDate: this.getSearchData.checkOutDate,
            numberOfNights: this.nights,
            numberOfRooms: this.toCount(this.rooms, 1),
            numberOfGuests: this.totalGuests,
          });
          if (version !== this.roomVersion || scope !== this.searchScope) return;
          this.room_list = (
            Array.isArray(response.data) ? response.data : response.data?.rooms || []
          ).map(this.normalizeRoom);
          this.roomSearchScope = scope;
        } catch {
          if (version === this.roomVersion) this.roomError = this.$t('guest.loadFailed');
        } finally {
          if (version === this.roomVersion) this.isSearchRoomLoading = false;
        }
      },
      handleRoomSelection(event, room) {
        const quantity = parseInt(event.target.value);
        if (!this.currentRooms) return;

        // Check if a selection already exists for this room
        const existingSelectionIndex = this.selectedRooms.findIndex(
          (option) => option.room_id === room.room_id
        );

        if (quantity === 0) {
          // Remove selection if quantity is set to 0
          if (existingSelectionIndex !== -1) {
            this.selectedRooms.splice(existingSelectionIndex, 1);
          }
        } else {
          const totalPrice = quantity * Number(room.price_per_night);

          const selection = {
            room_id: room.room_id,
            roomQuantity: quantity,
            roomName: room.room_name,
            totalPrice: totalPrice,
          };

          if (existingSelectionIndex !== -1) {
            // Update the existing selection
            this.selectedRooms[existingSelectionIndex] = selection;
          } else {
            // Add new selection
            this.selectedRooms.push(selection);
          }
        }
      },
      // this method will be called when user click book button
      async processBooking() {
        if (this.bookingPending || !this.currentRooms || !this.selectedRooms.length) return;
        // Booking a hold requires an account. Send guests to the login page and
        // bring them back here afterwards instead of surfacing the API's 401 as a
        // "Authentication required" toast.
        if (!this.isUserAuthenticated) {
          this.$router.push({ path: '/login', query: { redirect: this.$route.path } });
          return;
        }

        if (this.selectedRooms.length != 0) {
          const bookingInfor = {
            hotel: {
              hotel_id: this.hotel_id,
              name: this.hotel.name,
              address: this.hotel.address,
              overall_rating: this.hotel.overall_rating,
              check_in_time: this.hotel.check_in_time,
              check_out_time: this.hotel.check_out_time,
            },
            totalPrice: this.totalPriceSelectedRooms,
            totalRooms: this.totalSelectedRooms,
            selectedRooms: this.selectedRooms,
            adults: this.toCount(this.adults, 1),
            children: this.toCount(this.children, 0),
            numberOfGuests: this.totalGuests,
            checkInDate: this.getSearchData.checkInDate,
            checkOutDate: this.getSearchData.checkOutDate,
            numberOfDays: this.nights,
          };

          this.bookingPending = true;
          try {
            const holdResponse = await HoldService.createHold({
              hotelId: this.hotel_id,
              checkInDate: this.getSearchData.checkInDate,
              checkOutDate: this.getSearchData.checkOutDate,
              numberOfGuests: this.totalGuests,
              rooms: this.selectedRooms.map((room) => ({
                roomId: room.room_id,
                quantity: room.roomQuantity,
              })),
              currency: 'USD',
            });

            this.booking({
              ...bookingInfor,
              hold: holdResponse.data,
              holdId: holdResponse.data.holdId,
              totalPrice: holdResponse.data.totalPrice,
              priceBreakdown: holdResponse.data.priceBreakdown,
              cancellationPolicy: holdResponse.data.cancellationPolicy,
            });

            this.$router.push('/book');
          } catch (error) {
            // A stale/expired session also surfaces as 401; redirect to login
            // rather than showing the raw API message.
            if (error.response?.status === 401) {
              this.$router.push({ path: '/login', query: { redirect: this.$route.path } });
            } else {
              errorHandler(error);
            }
          } finally {
            this.bookingPending = false;
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
      calculateDistance(lat2, lon2) {
        const toRadians = (degrees) => degrees * (Math.PI / 180);

        const R = 6371000; // Earth's radius in meters
        const φ1 = toRadians(this.hotel.latitude);
        const φ2 = toRadians(lat2);
        const Δφ = toRadians(lat2 - this.hotel.latitude);
        const Δλ = toRadians(lon2 - this.hotel.longitude);

        const a =
          Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return Math.round(R * c); // Distance in meters
      },
    },
  };
</script>
<template>
  <div id="hotelDetails">
    <TheHeader :is-search-open="true" />
    <MapComponent v-if="openMapPopup" :hotels="[hotel]" @close-map-popup="closeMapPopup" />
    <ImageGallery
      :room_list="room_list"
      :hotel-images="hotelImages"
      :is-open-image-gallery="isImageGalleryOpen"
      @close-image-gallery="closeImageGallery"
    />
    <ReviewValidation
      v-if="showReviewValidation"
      :hotel-id="hotel_id"
      :hotel-name="hotel.name"
      @close="closeReviewValidation"
    />
    <main id="guest-main" tabindex="-1" class="guest-page hotel-page">
      <p v-if="detailsLoading" role="status" class="guest-section">{{ $t('guest.loading') }}</p>
      <section v-else-if="detailsError" class="guest-section" role="alert">
        <h1 class="guest-page-title">{{ $t(detailsError) }}</h1>
        <button type="button" class="guest-button" @click="getHotelDetails">
          {{ $t('guest.retry') }}
        </button>
      </section>
      <template v-else>
        <div class="property-heading">
          <div>
            <p v-if="hotel.hotelClass" class="guest-subtitle">
              {{ $t('guest.hotelClass', { count: hotel.hotelClass }) }}
            </p>
            <h1 class="guest-page-title">{{ hotel.name }}</h1>
            <p class="guest-subtitle">{{ hotel.address }}</p>
            <p v-if="hotel.overall_rating > 0" class="property-rating">
              <span class="guest-score">{{ hotel.overall_rating }}<small>/10</small></span
              ><button type="button" class="property-review-link" @click="showCommentPopup">
                {{ overallRatingLabel }} ·
                {{ $t('userHome.reviewCount', { count: totalReviewCount }) }}
              </button>
            </p>
          </div>
          <a class="guest-button" href="#price">{{ $t('hotelDetails.overview.bookNow') }}</a>
        </div>
        <section
          :class="{ 'property-gallery-sparse': hotelImages.length < 3 }"
          class="property-gallery"
          :aria-label="$t('guest.photos')"
        >
          <button
            v-for="(image, index) in hotelImages.slice(0, 5)"
            :key="image"
            type="button"
            :aria-label="$t('guest.openPhoto', { count: index + 1 })"
            @click="openImageGallery"
          >
            <MediaImage :src="image" :alt="hotel.name" /></button
          ><MediaImage v-if="!hotelImages.length" :alt="hotel.name" /><button
            v-if="hotelImages.length"
            type="button"
            class="gallery-all guest-button guest-button-secondary"
            @click="openImageGallery"
          >
            {{ $t('guest.allPhotos') }}
          </button>
        </section>
        <nav class="property-tabs" :aria-label="$t('guest.hotelSections')">
          <a href="#overview">{{ $t('hotelDetails.menu.overview') }}</a
          ><a href="#price">{{ $t('hotelDetails.menu.infoAndPrice') }}</a
          ><a href="#policy">{{ $t('hotelDetails.menu.policy') }}</a
          ><a href="#review">{{ $t('hotelDetails.menu.reviews') }}</a>
        </nav>
        <div class="property-layout">
          <div class="property-sections">
            <section id="overview" class="guest-section">
              <h2>{{ $t('hotelDetails.menu.overview') }}</h2>
              <p class="property-description">
                {{ hotel.description || $t('guest.noDescription') }}
              </p>
              <template v-if="hotelAmenities.length"
                ><h3>{{ $t('hotelDetails.menu.amenities') }}</h3>
                <ul class="property-amenities">
                  <li v-for="(amenity, index) in hotelAmenities" :key="amenity.id || index">
                    {{ typeof amenity === 'string' ? amenity : amenity.name }}
                  </li>
                </ul></template
              >
            </section>
            <section id="price" class="guest-section room-section">
              <h2>{{ $t('guest.chooseRoom') }}</h2>
              <p v-if="!nights" class="guest-subtitle">{{ $t('guest.roomDateHint') }}</p>
              <div class="room-criteria">
                <el-date-picker
                  v-model="dateRange"
                  type="daterange"
                  format="DD/MM/YYYY"
                  value-format="YYYY-MM-DD"
                  :start-placeholder="$t('userHeader.checkInPlaceholder')"
                  :end-placeholder="$t('userHeader.checkOutPlaceholder')"
                  :aria-label="$t('guest.dates')"
                  :disabled-date="disabledDate"
                /><button
                  type="button"
                  class="guest-button"
                  :disabled="isSearchRoomLoading"
                  @click="applyChange"
                >
                  {{ $t('hotelDetails.search.apply') }}
                </button>
              </div>
              <p v-if="roomError" role="alert">{{ roomError }}</p>
              <p v-if="isSearchRoomLoading" role="status">{{ $t('guest.loading') }}</p>
              <p v-else-if="!currentRooms" class="room-scope-hint">
                {{ $t('guest.refreshAvailability') }}
              </p>
              <template v-else
                ><p class="room-scope-hint">
                  {{ formatStayDate(getSearchData.checkInDate, $i18n.locale) }} →
                  {{ formatStayDate(getSearchData.checkOutDate, $i18n.locale) }} ·
                  {{ $t('bookingFlow.nightPlural', { count: nights }) }}
                </p>
                <article v-for="room in room_list" :key="room.room_id" class="room-card">
                  <div>
                    <h3>{{ room.room_name }}</h3>
                    <p>{{ $t('guest.maxGuests', { count: room.max_guests }) }}</p>
                    <ul>
                      <li v-for="amenity in toArray(room.room_amenities)" :key="amenity">
                        {{ amenity }}
                      </li>
                    </ul>
                    <p v-if="room.available_rooms === 0">{{ $t('guest.soldOut') }}</p>
                  </div>
                  <div class="room-card-price">
                    <strong>{{ guestMoney(room.price_per_night, 'USD', $i18n.locale) }}</strong
                    ><span>{{ $t('filters.perNight') }}</span
                    ><label
                      >{{ $t('hotelDetails.table.selectRoom')
                      }}<select
                        :aria-label="$t('guest.roomQuantity', { room: room.room_name })"
                        :disabled="bookingPending || !room.available_rooms"
                        :value="
                          selectedRooms.find((item) => item.room_id === room.room_id)
                            ?.roomQuantity || 0
                        "
                        @change="handleRoomSelection($event, room)"
                      >
                        <option value="0">0</option>
                        <option
                          v-for="n in Math.min(room.available_rooms || 0, 30)"
                          :key="n"
                          :value="n"
                        >
                          {{ n }}
                        </option>
                      </select></label
                    >
                  </div>
                </article>
                <EmptyState
                  v-if="!room_list.length"
                  :title="$t('hotelDetails.table.noRoomsTitle')"
                  :message="$t('hotelDetails.table.noRoomsMessage')"
                />
              </template>
            </section>
            <section id="policy" class="guest-section">
              <h2>{{ $t('hotelDetails.menu.policy') }}</h2>
              <dl class="stay-policies">
                <div>
                  <dt>{{ $t('bookingFlow.checkIn') }}</dt>
                  <dd>{{ checkInOut.checkInTime || '—' }}</dd>
                </div>
                <div>
                  <dt>{{ $t('bookingFlow.checkOut') }}</dt>
                  <dd>{{ checkInOut.checkOutTime || '—' }}</dd>
                </div>
              </dl>
              <p v-if="checkInOut.checkInPolicy">{{ checkInOut.checkInPolicy }}</p>
              <p v-if="checkInOut.checkOutPolicy">{{ checkInOut.checkOutPolicy }}</p>
              <article v-for="policy in hotelPolicies" :key="policy.id">
                <h3>{{ policy.title }}</h3>
                <p>{{ policy.description }}</p>
              </article>
              <p class="guest-subtitle">{{ $t('guest.policyQuote') }}</p>
            </section>
            <section id="review" class="guest-section">
              <h2>{{ $t('hotelDetails.menu.reviews') }}</h2>
              <p v-if="hotel.overall_rating > 0" class="property-rating">
                <span class="guest-score">{{ hotel.overall_rating }}<small>/10</small></span
                >{{ overallRatingLabel }} ·
                {{ $t('userHome.reviewCount', { count: totalReviewCount }) }}
              </p>
              <div class="criteria-grid">
                <div v-for="criteria in reviewCriterias" :key="criteria.criteria_key">
                  <span>{{ $t(criteria.criteria_key) }}</span
                  ><strong>{{ (criteria.average_score * 2).toFixed(1) }}/10</strong>
                </div>
              </div>
              <article
                v-for="review in reviews.slice(0, 3)"
                :key="review.review_id"
                class="property-review"
              >
                <p>
                  <strong>{{ review.username }}</strong
                  ><span class="guest-pill">{{ review.rating }}/10</span>
                </p>
                <p>{{ review.comment }}</p>
              </article>
              <button
                type="button"
                class="guest-button guest-button-secondary"
                @click="showCommentPopup"
              >
                {{ $t('hotelDetails.reviews.readAll') }}</button
              ><button type="button" class="property-review-link" @click="writeReview">
                {{ $t('guest.writeReview') }}
              </button>
            </section>
            <section v-if="nearbyPlaces.length" class="guest-section">
              <h2>{{ $t('hotelDetails.nearby.title') }}</h2>
              <ul>
                <li v-for="place in nearbyPlaces" :key="place.place_id">{{ place.place_name }}</li>
              </ul>
            </section>
          </div>
          <aside class="property-booking guest-section">
            <h2>{{ $t('guest.yourStay') }}</h2>
            <p v-if="nights">
              {{ formatStayDate(getSearchData.checkInDate, $i18n.locale) }} →
              {{ formatStayDate(getSearchData.checkOutDate, $i18n.locale) }}
            </p>
            <p>{{ guestDetails }}</p>
            <p class="property-address">{{ hotel.address }}</p>
            <button
              v-if="hasLocation"
              type="button"
              class="property-review-link"
              @click="openMapPopup = true"
            >
              {{ $t('searchResults.showOnMap') }}
            </button>
            <hr />
            <p>{{ $t('hotelDetails.table.roomsSelected', { count: totalSelectedRooms }) }}</p>
            <template v-if="totalSelectedRooms"
              ><p class="selected-rate">
                {{ guestMoney(totalPriceSelectedRooms, 'USD', $i18n.locale) }}
              </p>
              <small>{{ $t('guest.selectedNightlyRate') }}</small></template
            >
            <p class="guest-subtitle">{{ $t('guest.finalQuote') }}</p>
            <button
              type="button"
              class="guest-button"
              :disabled="!selectedRooms.length || !currentRooms || bookingPending"
              @click="processBooking"
            >
              {{ bookingPending ? $t('guest.loading') : $t('hotelDetails.table.bookButton') }}
            </button>
          </aside>
        </div>
      </template>
    </main>
    <el-dialog
      v-model="openCommentPopup"
      :title="$t('hotelDetails.menu.reviews')"
      width="800px"
      append-to-body
      ><form class="review-filters" @submit.prevent="applyReviewFilters">
        <input
          v-model="reviewFilters.q"
          type="search"
          :aria-label="$t('hotelDetails.reviews.filters.keywordPlaceholder')"
          :placeholder="$t('hotelDetails.reviews.filters.keywordPlaceholder')"
        /><select
          v-model="reviewFilters.score"
          :aria-label="$t('hotelDetails.reviews.filters.score')"
        >
          <option value="">{{ $t('guest.allRatings') }}</option>
          <option value="excellent">9–10</option>
          <option value="good">7–9</option>
          <option value="average">5–7</option>
          <option value="poor">1–5</option></select
        ><select
          v-model="reviewFilters.season"
          :aria-label="$t('hotelDetails.reviews.filters.season')"
        >
          <option value="">{{ $t('guest.allSeasons') }}</option>
          <option value="marMay">{{ $t('hotelDetails.reviews.filters.seasons.marMay') }}</option>
          <option value="junAug">{{ $t('hotelDetails.reviews.filters.seasons.junAug') }}</option>
          <option value="sepNov">{{ $t('hotelDetails.reviews.filters.seasons.sepNov') }}</option>
          <option value="decFeb">
            {{ $t('hotelDetails.reviews.filters.seasons.decFeb') }}
          </option></select
        ><select
          v-model="reviewFilters.country"
          :aria-label="$t('hotelDetails.reviews.filters.country')"
        >
          <option value="">{{ $t('guest.allCountries') }}</option>
          <option v-for="country in reviewCountries" :key="country" :value="country">
            {{ country }}
          </option></select
        ><label
          ><input v-model="reviewFilters.hasMedia" type="checkbox" />
          {{ $t('guest.withPhotos') }}</label
        ><button class="guest-button" type="submit">{{ $t('guest.search') }}</button
        ><button
          class="guest-button guest-button-secondary"
          type="button"
          @click="clearReviewFilters"
        >
          {{ $t('guest.clear') }}
        </button>
      </form>
      <p v-if="reviewsLoading" role="status">{{ $t('guest.loading') }}</p>
      <p v-else-if="reviewsError" role="alert">{{ reviewsError }}</p>
      <template v-else
        ><article v-for="review in popupReviews" :key="review.review_id" class="property-review">
          <p>
            <strong>{{ review.username }}</strong>
            <span class="guest-pill">{{ review.rating }}/10</span>
            {{ formatReviewDate(review.created_at) }}
          </p>
          <h3 v-if="review.title">{{ review.title }}</h3>
          <p>{{ review.comment }}</p>
          <div class="review-images">
            <MediaImage
              v-for="image in review.media"
              :key="image.id"
              :src="image.thumbnail_url || image.url"
              :alt="review.title || hotel.name"
            />
          </div>
          <blockquote v-if="review.reply">{{ review.reply.comment }}</blockquote>
          <div class="review-votes">
            <button
              type="button"
              :aria-pressed="review.viewer_vote === true"
              @click="voteReview(review, true)"
            >
              {{ $t('guest.helpful') }} ({{ review.helpful_count }})</button
            ><button
              type="button"
              :aria-pressed="review.viewer_vote === false"
              @click="voteReview(review, false)"
            >
              {{ $t('guest.notHelpful') }}
            </button>
          </div>
        </article>
        <p v-if="!popupReviews.length">{{ $t('guest.noReviews') }}</p>
        <div class="review-paging">
          <button
            type="button"
            :disabled="reviewPagination.page <= 1"
            @click="goToReviewPage(reviewPagination.page - 1)"
          >
            {{ $t('hotelDetails.reviews.pagination.prev') }}</button
          ><span>{{ reviewPagination.page }} / {{ reviewPagination.totalPages }}</span
          ><button
            type="button"
            :disabled="reviewPagination.page >= reviewPagination.totalPages"
            @click="goToReviewPage(reviewPagination.page + 1)"
          >
            {{ $t('hotelDetails.reviews.pagination.next') }}
          </button>
        </div></template
      ></el-dialog
    >
    <TheFooter />
  </div>
</template>
<style scoped>
  .hotel-page {
    padding-top: 16px;
  }
  .property-heading {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    align-items: center;
    margin-bottom: 24px;
  }
  .property-rating {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    margin-top: 16px;
  }
  .property-review-link {
    border: 0;
    background: transparent;
    color: var(--tn-action);
    padding: 8px 0;
    text-align: left;
    cursor: pointer;
    font-size: 13px;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .property-gallery {
    position: relative;
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    grid-template-rows: 190px 190px;
    gap: 12px;
    margin-bottom: 24px;
  }
  .property-gallery > button {
    border: 0;
    padding: 0;
    background: var(--tn-soft);
    border-radius: 14px;
    overflow: hidden;
    cursor: pointer;
  }
  .property-gallery > button:first-child {
    grid-row: span 2;
  }
  .property-gallery .guest-media {
    height: 100%;
  }
  .property-gallery > .guest-media {
    grid-column: 1 / -1;
    grid-row: span 2;
  }
  .property-gallery .gallery-all {
    position: absolute;
    right: 16px;
    bottom: 16px;
    background: white;
    padding: 10px 18px;
  }
  .property-tabs {
    display: flex;
    gap: 28px;
    overflow-x: auto;
    padding: 18px 4px;
    margin-bottom: 24px;
    border-bottom: 1px solid #ddd;
  }
  .property-tabs a {
    white-space: nowrap;
    font-size: 13px;
  }
  .property-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 310px;
    align-items: start;
    gap: 24px;
  }
  .property-sections {
    display: grid;
    gap: 24px;
    min-width: 0;
  }
  .property-sections section {
    scroll-margin-top: 24px;
  }
  .property-description {
    white-space: pre-line;
    font-size: 14px;
    color: var(--tn-muted);
  }
  .property-sections h3 {
    font-size: 16px;
    font-weight: 500;
    margin-top: 18px;
  }
  .property-amenities {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding-left: 20px;
    font-size: 13px;
  }
  .property-booking {
    position: sticky;
    top: 24px;
  }
  .property-booking p {
    font-size: 13px;
  }
  .property-booking small,
  .property-address {
    font-size: 12px;
    color: var(--tn-muted);
  }
  .property-booking .guest-button {
    width: 100%;
    margin-top: 20px;
  }
  .property-booking .selected-rate {
    font-size: 26px;
    font-weight: 500;
    margin-bottom: 0;
  }
  .room-criteria {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin: 20px 0;
  }
  .room-criteria :deep(.el-date-editor) {
    min-width: 0;
    width: 100%;
    flex: 1 1 240px;
    min-height: 44px;
  }
  .room-card {
    display: flex;
    gap: 20px;
    justify-content: space-between;
    padding: 24px 0;
    border-bottom: 1px solid #eee;
  }
  .room-card ul,
  .room-card p {
    font-size: 12px;
    color: var(--tn-muted);
  }
  .room-card-price {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 120px;
  }
  .room-card-price strong {
    font-size: 22px;
  }
  .room-card-price span,
  .room-card-price label {
    font-size: 12px;
    color: var(--tn-muted);
  }
  .room-card-price select {
    display: block;
    width: 100%;
    border: 1px solid #ccc;
    border-radius: 10px;
    min-height: 44px;
    background: #f8f8f8;
    padding: 8px;
  }
  .room-scope-hint {
    border-radius: 12px;
    padding: 16px;
    background: var(--tn-soft);
    font-size: 13px;
  }
  .stay-policies,
  .criteria-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .stay-policies dt {
    font-size: 12px;
    color: var(--tn-muted);
    font-weight: 400;
  }
  .stay-policies dd {
    margin: 0;
  }
  .criteria-grid > div {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
    background: #f8f8f8;
    border-radius: 10px;
    padding: 12px;
  }
  .property-review {
    padding: 20px 0;
    border-top: 1px solid #eee;
    font-size: 14px;
  }
  .property-review > p:first-child {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .review-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  .review-filters input[type='search'],
  .review-filters select {
    min-height: 44px;
    border: 1px solid #ddd;
    border-radius: 10px;
    padding: 8px;
    max-width: 100%;
  }
  .review-votes,
  .review-paging {
    display: flex;
    gap: 16px;
    align-items: center;
  }
  .review-votes button,
  .review-paging button {
    background: white;
    border: 1px solid #ddd;
    border-radius: 10px;
    min-height: 44px;
    padding: 8px 14px;
  }
  .review-images {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .review-images .guest-media {
    width: 100px;
    height: 80px;
  }
  @media (max-width: 1023px) {
    .property-layout {
      grid-template-columns: minmax(0, 1fr);
    }
    .property-booking {
      position: static;
    }
  }
  @media (max-width: 600px) {
    .property-heading {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }
    .property-gallery {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 230px 130px;
    }
    .property-gallery > button:first-child {
      grid-row: auto;
      grid-column: 1 / -1;
    }
    .property-gallery > button:nth-child(n + 4):not(.gallery-all) {
      display: none;
    }
    .room-card {
      flex-direction: column;
    }
    .room-card-price {
      align-items: flex-start;
    }
    .room-card-price label {
      width: 100%;
    }
    .criteria-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>

<style scoped>
  .property-gallery-sparse {
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
    grid-template-rows: 320px;
  }
  .property-gallery-sparse > button:first-child {
    grid-row: auto;
    grid-column: auto;
  }
  @media (max-width: 600px) {
    .property-gallery-sparse {
      grid-template-rows: 230px;
    }
    .property-gallery-sparse > button:nth-child(2):not(.gallery-all) {
      display: none;
    }
  }
</style>
