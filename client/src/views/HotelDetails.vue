<script>
import TheHeader from '@/components/Header.vue'
import TheFooter from '@/components/Footer.vue'
import MapComponent from '@/components/map/MapComponent.vue'
import { mapActions, mapGetters } from 'vuex'
import ImageGallery from '@/components/hotel-image/ImageGallery.vue'
import { useToast } from 'vue-toastification'
import SkeletonGrid from '@/components/common/SkeletonGrid.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { HotelService } from '@/services/hotel.service'
import { ReviewService } from '@/services/review.service'
import { getImagePath, getImageUrl } from '@/utils/images'
import defaultAvatarImg from '@/assets/avatar/default_avatar.png'

// import ReviewForm from '@/components/review/ReviewForm.vue'
import ReviewValidation from '@/components/review/ReviewValidation.vue'

import errorHandler from '@/request/errorHandler'
import { HoldService } from '@/services/hold.service'

export default {
  components: {
    TheHeader,
    TheFooter,
    MapComponent,
    ImageGallery,
    SkeletonGrid,
    EmptyState,
    // ReviewForm,
    ReviewValidation
  },
  setup() {
    // Get toast interface
    const toast = useToast()
    // Make it available inside methods
    return { toast }
  },
  data() {
    return {
      hotel_id: null,

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
        q: ''
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
      isSearchRoomLoading: false
    }
  },
  computed: {
    ...mapGetters('auth', ['isUserAuthenticated', 'getUserId']),
    ...mapGetters('search', ['getSearchData']),
    // The search bar shares the Vuex `search` store with the header's main
    // search bar, so edits in either place stay in sync.
    adults: {
      get() {
        return this.toCount(this.getSearchData.adults, 1)
      },
      set(value) {
        this.updateAdults(this.toCount(value, 1))
      }
    },
    children: {
      get() {
        return this.toCount(this.getSearchData.children, 0)
      },
      set(value) {
        this.updateChildren(this.toCount(value, 0))
      }
    },
    rooms: {
      get() {
        return this.toCount(this.getSearchData.rooms, 1)
      },
      set(value) {
        this.updateRooms(this.toCount(value, 1))
      }
    },
    dateRange: {
      get() {
        const { checkInDate, checkOutDate } = this.getSearchData
        return checkInDate && checkOutDate ? [checkInDate, checkOutDate] : null
      },
      set(value) {
        if (Array.isArray(value) && value[0] && value[1]) {
          this.updateCheckInDate(value[0])
          this.updateCheckOutDate(value[1])
          this.updateNumberOfDays(this.calculateNumberOfDays(value[0], value[1]))
        } else {
          this.updateCheckInDate(null)
          this.updateCheckOutDate(null)
          this.updateNumberOfDays(null)
        }
      }
    },
    guestDetails() {
      return (
        `${this.adults} ` +
        this.$t('userHeader.guestInputPlaceholder_1') +
        ` · ${this.children} ` +
        this.$t('userHeader.guestInputPlaceholder_2') +
        ` · ${this.rooms} ` +
        this.$t('userHeader.guestInputPlaceholder_3')
      )
    },
    totalGuests() {
      return this.toCount(this.adults, 1) + this.toCount(this.children, 0)
    },
    displayedThumbnails() {
      return this.hotelImages.slice(3, 3 + this.initialThumbnailCount)
    },
    hasMoreImages() {
      return !this.showAll && this.hotelImages.length > 3 + this.initialThumbnailCount
    },
    remainingImages() {
      return this.hotelImages.length - (3 + this.initialThumbnailCount)
    },
    // The preview section always shows the top 3 most recent reviews.
    topReviews() {
      return this.reviews.slice(0, 3)
    },
    // Total number of published reviews, from the hotel rating summary when
    // available (the embedded list is capped).
    totalReviewCount() {
      return this.reviewsTotal || this.reviews.length
    },
    hasActiveReviewFilters() {
      const f = this.reviewFilters
      return Boolean(f.score || f.season || f.country || f.hasMedia || f.q)
    },
    // Fallback avatar for reviewers without a profile picture (an empty `src`
    // resolves to the page URL and renders a broken image).
    defaultAvatar() {
      return defaultAvatarImg
    },
    // Map the 0-10 overall rating to the same labels used by the search
    // filters, instead of always showing "Tuyệt hảo" regardless of the score.
    overallRatingLabel() {
      const rating = Number(this.hotel.overall_rating) || 0
      if (rating >= 9) return this.$t('hotelDetails.rating.excellent')
      if (rating >= 8) return this.$t('hotelDetails.rating.veryGood')
      if (rating >= 7) return this.$t('hotelDetails.rating.good')
      if (rating >= 6) return this.$t('hotelDetails.rating.pleasant')
      if (rating > 0) return this.$t('hotelDetails.rating.acceptable')
      return this.$t('hotelDetails.rating.noRating')
    },
    // calculate total number and total price of selected rooms
    totalSelectedRooms() {
      return this.selectedRooms.reduce((total, option) => total + option.roomQuantity, 0)
    },
    totalPriceSelectedRooms() {
      return this.selectedRooms.reduce((total, option) => total + option.totalPrice, 0)
    }
  },
  methods: {
    ...mapActions('book', ['booking', 'checkRoomAvailability']),
    ...mapActions('search', [
      'updateCheckInDate',
      'updateCheckOutDate',
      'updateNumberOfDays',
      'updateAdults',
      'updateRooms',
      'updateChildren'
    ]),
    calculateNumberOfDays(checkInDateString, checkOutDateString) {
      const checkInDate = new Date(checkInDateString)
      const checkOutDate = new Date(checkOutDateString)
      const timeDifference = checkOutDate - checkInDate
      return timeDifference / (1000 * 60 * 60 * 24) + 1
    },
    // Prevent selecting check-in dates in the past, matching the header bar.
    disabledDate(time) {
      return time.getTime() < Date.now() - 8.64e7
    },
    toArray(value) {
      if (Array.isArray(value)) return value
      if (typeof value !== 'string') return []

      try {
        const parsed = JSON.parse(value || '[]')
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    },
    toCount(value, fallback = 0) {
      const count = parseInt(value, 10)
      return Number.isFinite(count) ? count : fallback
    },
    normalizeRoom(room) {
      const roomAmenities = this.toArray(room.roomAmenities)
        .map((amenity) => (typeof amenity === 'string' ? amenity : amenity.name))
        .filter(Boolean)
      const roomImageUrls = this.toArray(room.roomImageUrls)
        .map((image) => (typeof image === 'string' ? image : image.object_key || image.url))
        .filter(Boolean)

      return {
        ...room,
        room_id: room.roomId || room.room_id,
        room_name: room.roomName || room.room_name,
        room_amenities: JSON.stringify(roomAmenities),
        room_image_urls: JSON.stringify(roomImageUrls),
        max_guests: room.maxGuests || room.max_guests,
        price_per_night: room.pricePerNight || room.price_per_night,
        available_rooms: room.availableRooms || room.available_rooms
      }
    },
    // Reviews arrive in two shapes: the embedded hotel-details payload is
    // camelCase, the paginated /reviews/hotels/:id endpoint returns raw rows
    // (snake_case). Normalise both to one shape for the template.
    normalizeReview(review) {
      const user = review.user || {}
      const profilePicture = user.profilePictureUrl ?? user.profile_picture_url
      const country = user.country ?? review.country ?? null

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
        reply: this.normalizeReviewReply(review.reply)
      }
    },
    normalizeReviewMedia(media) {
      const list = Array.isArray(media) ? media : this.toArray(media)

      return list
        .map((item) => {
          if (!item) return null
          if (typeof item === 'string') {
            return { id: item, url: getImageUrl(item), thumbnail_url: getImageUrl(item) }
          }

          const url = item.thumbnailUrl ?? item.thumbnail_url ?? item.url ?? item.media_url
          return {
            id: item.id ?? url,
            url: getImageUrl(item.url ?? item.media_url ?? item.thumbnail_url),
            thumbnail_url: getImageUrl(url)
          }
        })
        .filter((item) => item && item.url)
    },
    normalizeReviewReply(reply) {
      if (!reply) return null
      const text = reply.comment ?? reply.reply_text ?? reply.text
      if (!text) return null

      return { comment: text, created_at: reply.createdAt ?? reply.created_at ?? null }
    },
    normalizeReviewCriterias(ratingBreakdown = {}) {
      const keys = ['cleanliness', 'location', 'service', 'valueForMoney', 'overall']

      return keys
        .map((key) => {
          const score = Number(ratingBreakdown[key])
          if (!Number.isFinite(score)) return null

          return {
            criteria_key: `hotelDetails.criteria.${key}`,
            average_score: score / 2
          }
        })
        .filter(Boolean)
    },
    normalizeNearbyPlace(place) {
      return {
        ...place,
        place_id: place.id,
        place_name: place.name,
        place_latitude: place.latitude,
        place_longitude: place.longitude
      }
    },
    async getHotelDetails() {
      try {
        const response = await HotelService.getHotelDetails(this.$route.params.hotel_id, {
          checkInDate: this.getSearchData.checkInDate,
          checkOutDate: this.getSearchData.checkOutDate,
          numberOfRooms: this.getSearchData.rooms,
          numberOfGuests:
            parseInt(this.getSearchData.adults) + parseInt(this.getSearchData.children)
        })

        const details = response.data || {}
        const hotel = details.hotel || {}

        this.hotel = {
          ...hotel,
          hotel_id: hotel.id || hotel.hotel_id || this.$route.params.hotel_id,
          overall_rating:
            details.ratingSummary?.overallRating || details.ratingBreakdown?.overall || 0,
          check_in_time: details.checkInOut?.checkInTime,
          check_out_time: details.checkInOut?.checkOutTime
        }
        this.room_list = (details.rooms || []).map(this.normalizeRoom)
        this.reviews = (details.reviews || []).map(this.normalizeReview)
        this.reviewsTotal = Number(details.ratingSummary?.totalReviews) || this.reviews.length
        this.reviewCriterias = this.normalizeReviewCriterias(details.ratingBreakdown)
        this.nearbyPlaces = (details.nearbyPlaces || []).map(this.normalizeNearbyPlace)
        this.hotelImages = (details.images || [])
          .slice()
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
          .map((image) => getImageUrl(getImagePath(image)))
          .filter(Boolean)
      } catch (error) {
        errorHandler(error)
      }
    },
    /******** comment popup *******/
    showCommentPopup() {
      this.openCommentPopup = true
      this.fetchPopupReviews(1)
    },
    hideCommentPopup() {
      this.openCommentPopup = false
    },
    // Build the query params for the paginated reviews endpoint from the
    // current filter state (empty values are omitted).
    reviewQueryParams(page) {
      const scoreBands = {
        excellent: { minRating: 9 },
        good: { minRating: 7, maxRating: 9 },
        average: { minRating: 5, maxRating: 7 },
        poor: { maxRating: 5 }
      }
      const monthsBySeason = {
        marMay: '3,4,5',
        junAug: '6,7,8',
        sepNov: '9,10,11',
        decFeb: '12,1,2'
      }
      const filters = this.reviewFilters
      const band = scoreBands[filters.score] || {}

      const params = { page, limit: this.reviewPagination.limit }
      if (band.minRating !== undefined) params.minRating = band.minRating
      if (band.maxRating !== undefined) params.maxRating = band.maxRating
      if (monthsBySeason[filters.season]) params.months = monthsBySeason[filters.season]
      if (filters.country) params.country = filters.country
      if (filters.hasMedia) params.hasMedia = true
      if (filters.q.trim()) params.q = filters.q.trim()

      return params
    },
    async fetchPopupReviews(page = 1) {
      this.reviewsLoading = true
      try {
        const response = await ReviewService.getHotelReviews(
          this.hotel_id,
          this.reviewQueryParams(page)
        )
        const data = response?.data ?? []
        const meta = response?.meta ?? {}

        this.popupReviews = data.map(this.normalizeReview)
        const limit = meta.limit ?? this.reviewPagination.limit
        const total = meta.total ?? this.popupReviews.length
        this.reviewPagination = {
          page: meta.page ?? page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit))
        }
        this.reviewCountries = meta.facets?.countries ?? []
      } catch (error) {
        errorHandler(error)
        this.popupReviews = []
      } finally {
        this.reviewsLoading = false
      }
    },
    applyReviewFilters() {
      this.fetchPopupReviews(1)
    },
    clearReviewFilters() {
      this.reviewFilters = { score: '', season: '', country: '', hasMedia: false, q: '' }
      this.fetchPopupReviews(1)
    },
    goToReviewPage(page) {
      if (this.reviewsLoading) return
      if (page < 1 || page > this.reviewPagination.totalPages) return
      if (page === this.reviewPagination.page) return
      this.fetchPopupReviews(page)
    },
    // Map a 1-10 review score to the shared rating labels.
    reviewRatingLabel(rating) {
      const score = Number(rating) || 0
      if (score >= 9) return this.$t('hotelDetails.rating.excellent')
      if (score >= 8) return this.$t('hotelDetails.rating.veryGood')
      if (score >= 7) return this.$t('hotelDetails.rating.good')
      if (score >= 6) return this.$t('hotelDetails.rating.pleasant')
      if (score > 0) return this.$t('hotelDetails.rating.acceptable')
      return this.$t('hotelDetails.rating.noRating')
    },
    formatReviewDate(value) {
      if (!value) return ''
      return new Date(value).toLocaleDateString(this.$i18n.locale)
    },
    // Cast or retract the caller's helpful vote on a review. Requires an
    // account; guests are sent to login and returned here afterwards.
    async voteReview(review, isHelpful) {
      if (!this.isUserAuthenticated) {
        this.$router.push({ path: '/login', query: { redirect: this.$route.path } })
        return
      }

      const index = this.popupReviews.findIndex((item) => item.review_id === review.review_id)
      if (index === -1) return

      // Clicking the active vote retracts it.
      const retracting = this.popupReviews[index].viewer_vote === isHelpful

      try {
        const response = retracting
          ? await ReviewService.removeReviewVote(review.review_id)
          : await ReviewService.voteReviewHelpful(review.review_id, isHelpful)

        const data = response?.data || {}
        this.popupReviews[index] = {
          ...this.popupReviews[index],
          viewer_vote: data.isHelpful ?? null,
          helpful_count: Number(data.helpfulCount) || 0
        }
      } catch (error) {
        errorHandler(error)
      }
    },
    // Criteria scores are normalised to a 0-5 scale on the client.
    criteriaBarWidth(averageScore) {
      const score = Number(averageScore) || 0
      return `${Math.max(0, Math.min(100, (score / 5) * 100))}%`
    },
    /******** review popup *******/
    closeReviewValidation() {
      this.showReviewValidation = false
    },
    /******** map popup ********/
    closeMapPopup() {
      this.openMapPopup = false
    },
    /******** image gallery popup ********/
    openImageGallery() {
      this.isImageGalleryOpen = true
      document.getElementById('hotelDetails').classList.add('no-scroll')
    },
    closeImageGallery() {
      this.isImageGalleryOpen = false
      document.getElementById('hotelDetails').classList.remove('no-scroll')
    },
    /*********** guest selection popup *******/
    toggleGuestSelector() {
      this.showGuestSelector = !this.showGuestSelector
    },
    updateGuests(type, action) {
      const increment = action === 'increment'
      if (type === 'adults') {
        if (increment && this.adults < 30) this.adults = this.adults + 1
        else if (!increment && this.adults > 1) this.adults = this.adults - 1
      } else if (type === 'children') {
        if (increment && this.children < 10) this.children = this.children + 1
        else if (!increment && this.children > 0) this.children = this.children - 1
      } else if (type === 'rooms') {
        if (increment && this.rooms < 30) this.rooms = this.rooms + 1
        else if (!increment && this.rooms > 1) this.rooms = this.rooms - 1
      }
    },
    hideGuestSelector() {
      this.showGuestSelector = false
    },
    async applyChange() {
      const { checkInDate, checkOutDate } = this.getSearchData

      // The values come from the shared store, so they may be missing when a
      // visitor lands on the hotel page without searching first.
      if (!checkInDate || !checkOutDate) {
        this.toast.error(this.$t('hotelDetails.search.datesRequired'))
        return
      }

      try {
        this.isSearchRoomLoading = true

        const response = await HotelService.searchAvailableRooms(this.hotel_id, {
          checkInDate,
          checkOutDate,
          numberOfRooms: this.toCount(this.rooms, 1),
          numberOfGuests: this.totalGuests
        })

        this.room_list = (response.data || []).map(this.normalizeRoom)
      } catch (error) {
        errorHandler(error)
      } finally {
        this.isSearchRoomLoading = false
      }
    },
    handleRoomSelection(event, room) {
      const quantity = parseInt(event.target.value)

      // Check if a selection already exists for this room
      const existingSelectionIndex = this.selectedRooms.findIndex(
        (option) => option.roomName === room.room_name
      )

      if (quantity === 0) {
        // Remove selection if quantity is set to 0
        if (existingSelectionIndex !== -1) {
          this.selectedRooms.splice(existingSelectionIndex, 1)
        }
      } else {
        const totalPrice = parseInt(quantity * room.price_per_night)

        const selection = {
          room_id: room.room_id,
          roomQuantity: quantity,
          roomName: room.room_name,
          totalPrice: totalPrice
        }

        if (existingSelectionIndex !== -1) {
          // Update the existing selection
          this.selectedRooms[existingSelectionIndex] = selection
        } else {
          // Add new selection
          this.selectedRooms.push(selection)
        }
      }
    },
    // this method will be called when user click book button
    async processBooking() {
      // Booking a hold requires an account. Send guests to the login page and
      // bring them back here afterwards instead of surfacing the API's 401 as a
      // "Authentication required" toast.
      if (!this.isUserAuthenticated) {
        this.$router.push({ path: '/login', query: { redirect: this.$route.path } })
        return
      }

      if (this.selectedRooms.length != 0) {
        const bookingInfor = {
          hotel: {
            hotel_id: this.hotel_id,
            name: this.hotel.name,
            address: this.hotel.address,
            overall_rating: this.hotel.overall_rating,
            check_in_time: this.hotel.check_in_time,
            check_out_time: this.hotel.check_out_time
          },
          totalPrice: this.totalPriceSelectedRooms,
          totalRooms: this.totalSelectedRooms,
          selectedRooms: this.selectedRooms,
          adults: this.toCount(this.adults, 1),
          children: this.toCount(this.children, 0),
          numberOfGuests: this.totalGuests,
          checkInDate: this.getSearchData.checkInDate,
          checkOutDate: this.getSearchData.checkOutDate,
          numberOfDays: this.getSearchData.numberOfDays
        }

        try {
          const holdResponse = await HoldService.createHold({
            hotelId: this.hotel_id,
            checkInDate: this.getSearchData.checkInDate,
            checkOutDate: this.getSearchData.checkOutDate,
            numberOfGuests: this.totalGuests,
            rooms: this.selectedRooms.map((room) => ({
              roomId: room.room_id,
              quantity: room.roomQuantity
            })),
            currency: 'USD'
          })

          this.booking({
            ...bookingInfor,
            hold: holdResponse.data,
            holdId: holdResponse.data.holdId,
            totalPrice: holdResponse.data.totalPrice,
            priceBreakdown: holdResponse.data.priceBreakdown,
            cancellationPolicy: holdResponse.data.cancellationPolicy
          })

          this.$router.push('/book')
        } catch (error) {
          // A stale/expired session also surfaces as 401; redirect to login
          // rather than showing the raw API message.
          if (error.response?.status === 401) {
            this.$router.push({ path: '/login', query: { redirect: this.$route.path } })
          } else {
            errorHandler(error)
          }
        }
      }
    },
    writeReview() {
      if (this.isUserAuthenticated) {
        this.showReviewValidation = true
      } else {
        this.$router.push({ path: '/login', query: { redirect: this.$route.path } })
      }
    },
    calculateDistance(lat2, lon2) {
      const toRadians = (degrees) => degrees * (Math.PI / 180)

      const R = 6371000 // Earth's radius in meters
      const φ1 = toRadians(this.hotel.latitude)
      const φ2 = toRadians(lat2)
      const Δφ = toRadians(lat2 - this.hotel.latitude)
      const Δλ = toRadians(lon2 - this.hotel.longitude)

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

      return Math.round(R * c) // Distance in meters
    }
  },
  async mounted() {
    this.hotel_id = this.$route.params.hotel_id
    // Fetch hotel details using hotelId
    await this.getHotelDetails()
  }
}
</script>
<template>
  <div id="hotelDetails" class="hotel-details-container">
    <TheHeader :isSearchOpen="true" />
    <MapComponent v-if="openMapPopup" :hotels="[hotel]" @close-map-popup="closeMapPopup" />
    <ImageGallery
      :room_list="room_list"
      :hotelImages="hotelImages"
      :isOpenImageGallery="isImageGalleryOpen"
      @close-image-gallery="closeImageGallery"
    />
    <ReviewValidation
      v-if="showReviewValidation"
      @close="closeReviewValidation"
      :hotelId="this.hotel_id"
      :hotelName="this.hotel.name"
    />
    <!-- menu  -->
    <div class="menu">
      <div class="container">
        <div class="menu__list">
          <ul>
            <li><a href="">{{ $t('hotelDetails.menu.overview') }}</a></li>
            <li><a href="#price">{{ $t('hotelDetails.menu.infoAndPrice') }}</a></li>
            <li>{{ $t('hotelDetails.menu.amenities') }}</li>
            <li><a href="#policy">{{ $t('hotelDetails.menu.policy') }}</a></li>
            <li>{{ $t('hotelDetails.menu.notes') }}</li>
            <li><a href="#review">{{ $t('hotelDetails.menu.reviews') }}</a></li>
          </ul>
        </div>
      </div>
    </div>

    <!-- end menu  -->

    <!-- overview  -->
    <div class="overview">
      <div class="container">
        <div class="overview__total">
          <div class="overview__image">
            <div class="overview__image--title">
              <h2>{{ hotel.name }}</h2>
              <button>{{ $t('hotelDetails.overview.bookNow') }}</button>
            </div>
            <div class="overview__image--location">
              <p><i class="fa-solid fa-location-dot"></i>{{ hotel.address }}</p>
            </div>

            <div class="gallery-container">
              <div class="featured-images">
                <div class="featured-left" @click="openImageGallery">
                  <img
                    :src="hotelImages[0]"
                    :alt="$t('hotelDetails.overview.featuredRoomAlt', { n: 1 })"
                    class="featured-image"
                    v-if="hotelImages.length > 0"
                  />
                </div>
                <div class="featured-right" @click="openImageGallery">
                  <img
                    :src="hotelImages[1]"
                    :alt="$t('hotelDetails.overview.featuredRoomAlt', { n: 2 })"
                    class="featured-image"
                    v-if="hotelImages.length > 1"
                  />
                  <img
                    :src="hotelImages[2]"
                    :alt="$t('hotelDetails.overview.featuredRoomAlt', { n: 3 })"
                    class="featured-image"
                    v-if="hotelImages.length > 2"
                  />
                </div>
              </div>

              <!-- Thumbnail grid -->
              <div class="thumbnail-grid">
                <div
                  v-for="(image, index) in displayedThumbnails"
                  :key="index"
                  class="thumbnail-item"
                  @click="openImageGallery"
                >
                  <img
                    :src="image"
                    :alt="$t('hotelDetails.overview.roomAlt', { n: index + 4 })"
                    class="thumbnail-image"
                  />
                </div>
                <div
                  v-if="hasMoreImages"
                  class="thumbnail-item more-images"
                  @click="openImageGallery"
                >
                  <div class="more-overlay">
                    <span>{{ $t('hotelDetails.overview.morePhotos', { count: remainingImages }) }}</span>
                  </div>
                  <img
                    :src="hotelImages[displayedThumbnails.length + 3]"
                    :alt="$t('hotelDetails.overview.roomAlt', { n: displayedThumbnails.length + 4 })"
                    class="thumbnail-image"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- end overview  -->

    <!-- information  -->
    <div class="information">
      <div class="container">
        <div class="information__total">
          <div class="information__text">
            <p>{{ this.hotel.description }}</p>
            <h3>{{ $t('hotelDetails.amenities.title') }}</h3>
            <ul>
              <li>
                <i class="fa-solid fa-bus"></i>
                <p>{{ $t('hotelDetails.amenities.airportShuttle') }}</p>
              </li>
              <li>
                <i class="fa-solid fa-ban-smoking"></i>
                <p>{{ $t('hotelDetails.amenities.nonSmoking') }}</p>
              </li>
              <li>
                <i class="fa-solid fa-wifi"></i>
                <p>{{ $t('hotelDetails.amenities.freeWifi') }}</p>
              </li>
              <li>
                <i class="fa-solid fa-people-roof"></i>
                <p>{{ $t('hotelDetails.amenities.familyRooms') }}</p>
              </li>
              <li>
                <i class="fa-solid fa-bell-concierge"></i>
                <p>{{ $t('hotelDetails.amenities.reception24h') }}</p>
              </li>
              <li>
                <i class="fa-solid fa-elevator"></i>
                <p>{{ $t('hotelDetails.amenities.elevator') }}</p>
              </li>
              <li>
                <i class="fa-regular fa-snowflake"></i>
                <p>{{ $t('hotelDetails.amenities.airConditioning') }}</p>
              </li>
            </ul>
          </div>
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
              {{ $t('searchResults.showOnMap') }}
            </button>
          </div>
        </div>
        <hr />
      </div>
    </div>
    <!-- end information  -->

    <!-- Search bar -->
    <div class="search container">
      <div>
        <div class="search-bar">
          <!-- Date picker (shares the search store with the header bar) -->
          <div class="date-picker">
            <ElDatePicker
              v-model="dateRange"
              type="daterange"
              class="search-date-picker"
              :range-separator="$t('userHeader.dateRangeSeparator')"
              :start-placeholder="$t('userHeader.checkInPlaceholder')"
              :end-placeholder="$t('userHeader.checkOutPlaceholder')"
              :aria-label="$t('hotelDetails.search.checkInOutPlaceholder')"
              :disabled-date="disabledDate"
              format="DD/MM/YYYY"
              value-format="YYYY-MM-DD"
            />
          </div>

          <!-- Guest room input -->
          <div class="guest-room-wrapper" v-click-outside="hideGuestSelector">
            <input
              type="text"
              v-model="guestDetails"
              class="search-input"
              :aria-label="$t('userHeader.guestInputLabel')"
              @click="toggleGuestSelector"
              readonly
            />

            <!-- Guest room selector -->
            <div v-if="showGuestSelector" class="guest-room-selector" id="guest-room-selector">
              <div class="selector-item">
                <span>{{ $t('userHeader.guestInputPlaceholder_1') }}</span>
                <div class="counter">
                  <button
                    class="decrement"
                    :disabled="adults <= 1"
                    @click="updateGuests('adults', 'decrement')"
                  >
                    -
                  </button>
                  <span>{{ adults }}</span>
                  <button
                    class="increment"
                    :disabled="adults >= 30"
                    @click="updateGuests('adults', 'increment')"
                  >
                    +
                  </button>
                </div>
              </div>
              <div class="selector-item">
                <span
                  >{{ $t('userHeader.guestInputPlaceholder_2') }}
                  <small>{{ $t('userHeader.childAgeSuffix') }}</small></span
                >
                <div class="counter">
                  <button
                    class="decrement"
                    :disabled="children <= 0"
                    @click="updateGuests('children', 'decrement')"
                  >
                    -
                  </button>
                  <span>{{ children }}</span>
                  <button
                    class="increment"
                    :disabled="children >= 10"
                    @click="updateGuests('children', 'increment')"
                  >
                    +
                  </button>
                </div>
              </div>
              <div class="selector-item">
                <span>{{ $t('userHeader.guestInputPlaceholder_3') }}</span>
                <div class="counter">
                  <button
                    class="decrement"
                    :disabled="rooms <= 1"
                    @click="updateGuests('rooms', 'decrement')"
                  >
                    -
                  </button>
                  <span>{{ rooms }}</span>
                  <button
                    class="increment"
                    :disabled="rooms >= 30"
                    @click="updateGuests('rooms', 'increment')"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Search button -->
          <button class="search-button" @click="applyChange">
            {{ $t('hotelDetails.search.apply') }}
          </button>
        </div>
      </div>
    </div>

    <!-- price -->
    <div class="container" id="price">
      <table>
        <thead>
          <tr class="table_header">
            <th class="table_header_1">{{ $t('hotelDetails.table.propertyType') }}</th>
            <th class="table_header_2">{{ $t('hotelDetails.table.guests') }}</th>
            <th class="table_header_3">{{ $t('hotelDetails.table.todayPrice') }}</th>
            <th class="table_header_4">{{ $t('hotelDetails.table.options') }}</th>
            <th class="table_header_5">{{ $t('hotelDetails.table.selectRoom') }}</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          <tr class="room_1" v-for="(room, index) in room_list" :key="room.room_id">
            <td>
              <a href="#" class="room-title">{{ room.room_name }}</a>
              <ul class="service">
                <li v-for="(amenity, index) in JSON.parse(room.room_amenities)" :key="index">
                  {{ amenity }}
                </li>
              </ul>
            </td>
            <td>
              <div class="price__customer price__customer--1">
                <i
                  class="fa-solid fa-user"
                  v-for="(guest, index) in room.max_guests"
                  :key="index"
                ></i>
              </div>
            </td>
            <td>
              <div class="price">
                {{ parseInt(room.price_per_night).toLocaleString('en-US') }}
              </div>
              <div class="tax-info">{{ $t('map.priceIncludes') }}</div>
            </td>
            <td>
              <ul class="benefits">
                <li>{{ $t('hotelDetails.table.freeCancellation') }}</li>
                <li>{{ $t('hotelDetails.table.noPrepayment') }}</li>
              </ul>
            </td>
            <td>
              <select
                :aria-label="$t('hotelDetails.table.roomsAriaLabel')"
                @change="handleRoomSelection($event, room)"
              >
                <option value="0" selected>0</option>
                <option v-for="n in room.available_rooms" :key="n" :value="n">
                  {{ n }} (USD {{ parseInt(n * room.price_per_night).toLocaleString('en-US') }})
                </option>
              </select>
            </td>
            <td v-if="index === 0" :rowspan="room_list.length">
              <div class="price__content">
                <div class="booking-summary-rooms-and-price">
                  {{ $t('hotelDetails.table.roomsSelected', { count: totalSelectedRooms }) }}
                  <div class="total-price" style="font-size: 20px">
                    USD {{ totalPriceSelectedRooms.toLocaleString('en-US') }}
                  </div>
                </div>
                <button @click="processBooking">{{ $t('hotelDetails.table.bookButton') }}</button>
                <div style="color: red; font-size: 13px" v-if="selectedRooms.length == 0">
                  {{ $t('hotelDetails.table.selectRoomsFirst') }}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <SkeletonGrid v-if="isSearchRoomLoading" :count="2" image-height="90px" />
      <EmptyState
        v-else-if="room_list.length === 0"
        :title="$t('hotelDetails.table.noRoomsTitle')"
        :message="$t('hotelDetails.table.noRoomsMessage')"
        icon="fa-solid fa-bed"
      />
    </div>

    <!-- end price -->

    <!-- review popup -->
    <div class="review__open" v-if="openCommentPopup">
      <div class="review__open--left"></div>
      <div class="review__open--right">
        <strong>{{ $t('hotelDetails.reviews.title') }}</strong>
        <button class="close" @click="hideCommentPopup()">x</button>
        <div class="review__open--point">
          <span class="point">{{ this.hotel.overall_rating }}</span>
          <div>
            <span style="font-weight: 500">{{ overallRatingLabel }}</span>
            <br />
            <span>{{ $t('userHome.reviewCount', { count: totalReviewCount }) }}</span>
          </div>
          <p>
            {{ $t('hotelDetails.reviews.authentic') }} <i class="fa-solid fa-circle-info"></i>
          </p>
          <button @click="writeReview">{{ $t('hotelDetails.reviews.writeReview') }}</button>
        </div>
        <hr />
        <div class="review__process">
          <strong>{{ $t('hotelDetails.reviews.categories') }}</strong>
          <div class="review__process--bar">
            <div class="row">
              <div
                class="col-lg-4 col-md-6 col-12"
                v-for="review in reviewCriterias"
                :key="review.criteria_key"
              >
                <div class="category">
                  <div>{{ $t(review.criteria_key) }}</div>
                  <div>
                    {{ Number((review.average_score / 5) * 10).toFixed(1) }}
                  </div>
                </div>
                <div class="process--bar">
                  <div class="bar" :style="{ width: criteriaBarWidth(review.average_score) }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <hr />
        <div class="review__number">
          <strong>{{ $t('hotelDetails.reviews.filters.title') }}</strong>
          <ul>
            <li>
              <p>{{ $t('hotelDetails.reviews.filters.score') }}</p>
              <select
                v-model="reviewFilters.score"
                :aria-label="$t('hotelDetails.reviews.filters.score')"
                @change="applyReviewFilters"
              >
                <option value="">{{ $t('hotelDetails.reviews.filters.scoreAny') }}</option>
                <option value="excellent">
                  {{ $t('hotelDetails.reviews.filters.scores.excellent') }}
                </option>
                <option value="good">{{ $t('hotelDetails.reviews.filters.scores.good') }}</option>
                <option value="average">
                  {{ $t('hotelDetails.reviews.filters.scores.average') }}
                </option>
                <option value="poor">{{ $t('hotelDetails.reviews.filters.scores.poor') }}</option>
              </select>
            </li>
            <li>
              <p>{{ $t('hotelDetails.reviews.filters.season') }}</p>
              <select
                v-model="reviewFilters.season"
                :aria-label="$t('hotelDetails.reviews.filters.season')"
                @change="applyReviewFilters"
              >
                <option value="">{{ $t('hotelDetails.reviews.filters.seasonAny') }}</option>
                <option value="marMay">{{ $t('hotelDetails.reviews.filters.seasons.marMay') }}</option>
                <option value="junAug">{{ $t('hotelDetails.reviews.filters.seasons.junAug') }}</option>
                <option value="sepNov">{{ $t('hotelDetails.reviews.filters.seasons.sepNov') }}</option>
                <option value="decFeb">{{ $t('hotelDetails.reviews.filters.seasons.decFeb') }}</option>
              </select>
            </li>
            <li>
              <p>{{ $t('hotelDetails.reviews.filters.country') }}</p>
              <select
                v-model="reviewFilters.country"
                :aria-label="$t('hotelDetails.reviews.filters.country')"
                @change="applyReviewFilters"
              >
                <option value="">{{ $t('hotelDetails.reviews.filters.countryAny') }}</option>
                <option v-for="item in reviewCountries" :key="item.country" :value="item.country">
                  {{ item.country }} ({{ item.count }})
                </option>
              </select>
            </li>
            <li class="review__number--toggle">
              <label>
                <input
                  type="checkbox"
                  v-model="reviewFilters.hasMedia"
                  @change="applyReviewFilters"
                />
                {{ $t('hotelDetails.reviews.filters.hasMedia') }}
              </label>
            </li>
          </ul>
          <div class="review__number--search">
            <input
              type="text"
              v-model="reviewFilters.q"
              :placeholder="$t('hotelDetails.reviews.filters.keywordPlaceholder')"
              :aria-label="$t('hotelDetails.reviews.filters.keywordPlaceholder')"
              @keyup.enter="applyReviewFilters"
            />
            <button
              class="search visible"
              :aria-label="$t('hotelDetails.reviews.filters.search')"
              @click="applyReviewFilters"
            >
              <i class="fa-solid fa-magnifying-glass"></i>
            </button>
            <button v-if="hasActiveReviewFilters" class="smooth visible" @click="clearReviewFilters">
              {{ $t('hotelDetails.reviews.filters.clear') }}
            </button>
          </div>
        </div>
        <hr />
        <div class="review__open--headline">
          <strong>{{ $t('hotelDetails.reviews.title') }}</strong>
          <span>{{
            $t('hotelDetails.reviews.filters.results', { count: reviewPagination.total })
          }}</span>
        </div>

        <p v-if="reviewsLoading" class="review__open--status">
          {{ $t('hotelDetails.reviews.loading') }}
        </p>
        <p v-else-if="popupReviews.length === 0" class="review__open--status">
          {{ $t('hotelDetails.reviews.filters.empty') }}
        </p>
        <div class="review__open--text" v-for="review in popupReviews" :key="review.review_id">
          <div class="review__open--infor">
            <div class="name">
              <img
                :src="review.profile_picture_url || defaultAvatar"
                alt="avatar"
                style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover"
              />
              <div class="infor">
                <span style="font-weight: 600">{{ review.username }}</span>
                <br />
                <span>{{ review.country || $t('hotelDetails.reviews.countryFallback') }}</span>
                <span v-if="review.is_verified" class="verified-badge">
                  <i class="fa-solid fa-circle-check"></i>
                  {{ $t('hotelDetails.reviews.verified') }}
                </span>
              </div>
            </div>
            <div>
              <div class="service">
                <i class="fa-regular fa-calendar"></i>
                <span>{{ formatReviewDate(review.created_at) }}</span>
              </div>
              <div v-if="review.helpful_count > 0" class="service">
                <i class="fa-regular fa-thumbs-up"></i>
                <span>{{
                  $t('hotelDetails.reviews.helpfulCount', { count: review.helpful_count })
                }}</span>
              </div>
            </div>
          </div>
          <div class="review__open--desc">
            <div class="point">
              <div>
                <p>
                  {{
                    $t('hotelDetails.reviews.reviewDate', {
                      date: formatReviewDate(review.created_at)
                    })
                  }}
                </p>
                <strong>{{ reviewRatingLabel(review.rating) }}</strong>
              </div>
              <span>{{ review.rating }}</span>
            </div>
            <div class="text">
              <p v-if="review.title"><strong>{{ review.title }}</strong></p>
              <span>{{ review.comment }}</span>
            </div>
            <div v-if="review.media.length" class="review__open--media">
              <img
                v-for="media in review.media"
                :key="media.id"
                :src="media.thumbnail_url || media.url"
                :alt="$t('hotelDetails.reviews.photoAlt')"
              />
            </div>
            <div v-if="review.reply" class="review__open--reply">
              <strong>{{ $t('hotelDetails.reviews.replyLabel') }}</strong>
              <p>{{ review.reply.comment }}</p>
            </div>
            <div v-if="review.author_id !== getUserId" class="review__open--vote">
              <button
                type="button"
                :class="{ active: review.viewer_vote === true }"
                :aria-pressed="review.viewer_vote === true ? 'true' : 'false'"
                @click="voteReview(review, true)"
              >
                <i class="fa-regular fa-thumbs-up"></i>
                {{ $t('hotelDetails.reviews.helpful') }}
              </button>
              <button
                type="button"
                :class="{ active: review.viewer_vote === false }"
                :aria-pressed="review.viewer_vote === false ? 'true' : 'false'"
                @click="voteReview(review, false)"
              >
                <i class="fa-regular fa-thumbs-down"></i>
                {{ $t('hotelDetails.reviews.notHelpful') }}
              </button>
            </div>
          </div>
        </div>
        <hr />
        <div v-if="reviewPagination.totalPages > 1" class="pagination">
          <button
            :aria-label="$t('hotelDetails.reviews.pagination.prev')"
            :disabled="reviewPagination.page <= 1 || reviewsLoading"
            @click="goToReviewPage(reviewPagination.page - 1)"
          >
            <i class="fa-solid fa-arrow-left"></i>
          </button>
          <span class="pagination__status">{{
            $t('hotelDetails.reviews.pagination.pageOf', {
              page: reviewPagination.page,
              total: reviewPagination.totalPages
            })
          }}</span>
          <button
            :aria-label="$t('hotelDetails.reviews.pagination.next')"
            :disabled="reviewPagination.page >= reviewPagination.totalPages || reviewsLoading"
            @click="goToReviewPage(reviewPagination.page + 1)"
          >
            <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- review -->
    <div class="review" id="review">
      <div class="container">
        <div class="review__total">
          <div class="review__point">
            <div class="review__point--left">
              <h3>{{ $t('hotelDetails.reviews.title') }}</h3>
              <span class="point">{{ this.hotel.overall_rating }}</span>
              <span style="font-weight: 500; margin-left: 5px"
                >{{ overallRatingLabel }} -
                {{ $t('userHome.reviewCount', { count: totalReviewCount }) }}
              </span>
            </div>
            <div class="review__point--right">
              <button>{{ $t('hotelDetails.reviews.viewRooms') }}</button>
            </div>
          </div>
          <div class="review__process">
            <strong>{{ $t('hotelDetails.reviews.categories') }}</strong>
            <div class="review__process--bar">
              <div class="row">
                <div
                  class="col-lg-4 col-md-6 col-12"
                  v-for="review in reviewCriterias"
                  :key="review.criteria_key"
                >
                  <div class="category">
                    <div>{{ $t(review.criteria_key) }}</div>
                    <div>
                      {{ Number((review.average_score / 5) * 10).toFixed(1) }}
                    </div>
                  </div>
                  <div class="process--bar">
                    <div class="bar" :style="{ width: criteriaBarWidth(review.average_score) }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="review__text">
            <strong>{{ $t('hotelDetails.reviews.whatGuestsLiked') }}</strong>
            <div class="row">
              <div class="col-xl-4 col-md-6 col-12" v-for="review in topReviews" :key="review.review_id">
                <div class="reviewer">
                  <div class="name">
                    <img :src="review.profile_picture_url || defaultAvatar" alt="avatar" />
                    <div class="infor">
                      <span style="font-weight: 600">{{ review.username }}</span>
                      <br />
                      <span>{{ review.country || $t('hotelDetails.reviews.countryFallback') }}</span>
                    </div>
                  </div>
                  <div class="text">
                    <p>“{{ review.comment }}”</p>
                    <span class="reviewer__meta">
                      <span class="reviewer__score">{{ review.rating }}</span>
                      {{ reviewRatingLabel(review.rating) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button class="btnAll" @click="showCommentPopup()">
            {{ $t('hotelDetails.reviews.readAll') }}
          </button>
        </div>
      </div>
    </div>
    <!-- end review -->

    <!-- surrounding -->
    <div class="surrounding">
      <div class="container">
        <div class="surrounding__total">
          <div class="sur__title">
            <div class="surrounding__name">
              <h3>{{ $t('hotelDetails.nearby.title') }}</h3>
              <a href="">{{ $t('hotelDetails.nearby.greatLocation') }}</a>
            </div>
            <div class="sur__button">
              <button>{{ $t('hotelDetails.reviews.viewRooms') }}</button>
            </div>
          </div>
          <div class="row">
            <div class="col-xl-4 col-md-6 col-12">
              <i class="fa-solid fa-person-walking"></i>
              <strong>{{ $t('hotelDetails.nearby.whatsAround') }}</strong>
              <div
                class="sur__have"
                v-for="place in nearbyPlaces.slice(0, 10)"
                :key="place.place_id"
              >
                <div class="sur__have--item">
                  <div class="sur__have--name">{{ place.place_name }}</div>
                  <div class="sur__have--meters">
                    {{
                      calculateDistance(Number(place.place_latitude), Number(place.place_longitude))
                    }}
                    m
                  </div>
                </div>
              </div>
            </div>
            <div class="col-xl-4 col-md-6 col-12">
              <i class="fa-solid fa-person-walking"></i> <strong></strong>
              <div class="sur__have">
                <div
                  class="sur__have--item"
                  v-for="place in nearbyPlaces.slice(10, 20)"
                  :key="place.place_id"
                >
                  <div class="sur__have--name">{{ place.place_name }}</div>
                  <div class="sur__have--meters">
                    {{
                      calculateDistance(Number(place.place_latitude), Number(place.place_longitude))
                    }}
                    m
                  </div>
                </div>
              </div>
            </div>
            <div class="col-xl-4 col-md-6 col-12">
              <i class="fa-solid fa-person-walking"></i> <strong></strong>
              <div class="sur__have">
                <div
                  class="sur__have--item"
                  v-for="place in nearbyPlaces.slice(20, 30)"
                  :key="place.place_id"
                >
                  <div class="sur__have--name">{{ place.place_name }}</div>
                  <div class="sur__have--meters">
                    {{
                      calculateDistance(Number(place.place_latitude), Number(place.place_longitude))
                    }}
                    m
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- end surrounding -->

    <!-- policy -->
    <div class="policy" id="policy">
      <div class="container">
        <div class="policy__total">
          <div class="policy__title">
            <div class="policy__name">
              <h3>{{ $t('hotelDetails.policy.title') }}</h3>
              <span>{{
                $t('hotelDetails.policy.specialRequest', { hotel: this.hotel.name })
              }}</span>
            </div>
            <div class="policy__button">
              <button>{{ $t('hotelDetails.reviews.viewRooms') }}</button>
            </div>
          </div>
          <div class="policy__condition">
            <div class="policy__condition--total">
              <div class="policy__condition--title">
                <i class="fa-solid fa-circle-info"></i>
                <strong>{{ $t('hotelDetails.policy.cancellation.title') }}</strong>
              </div>
              <div class="policy__condition--text">
                <p>
                  {{ $t('hotelDetails.policy.cancellation.p1') }}
                </p>
                <p>
                  {{ $t('hotelDetails.policy.cancellation.p2Prefix')
                  }}<a href="">{{ $t('hotelDetails.policy.cancellation.p2Link') }}</a
                  >{{ $t('hotelDetails.policy.cancellation.p2Suffix') }}
                </p>
              </div>
            </div>
            <div class="policy__condition--total">
              <div class="policy__condition--title">
                <i class="fa-solid fa-hands-holding-child"></i>
                <strong>{{ $t('hotelDetails.policy.children.title') }}</strong>
              </div>
              <div class="policy__condition--text">
                <p><strong>{{ $t('hotelDetails.policy.children.policyLabel') }}</strong></p>
                <p>{{ $t('hotelDetails.policy.children.suitable') }}</p>
                <p>
                  {{ $t('hotelDetails.policy.children.priceInfo') }}
                </p>
                <p><strong>{{ $t('hotelDetails.policy.children.policyLabel') }}</strong></p>
                <p>{{ $t('hotelDetails.policy.children.noCrib') }}</p>
              </div>
            </div>
            <div class="policy__condition--total">
              <div class="policy__condition--title">
                <i class="fa-solid fa-person"></i>
                <strong>{{ $t('hotelDetails.policy.age.title') }}</strong>
              </div>
              <div class="policy__condition--text">
                <p>{{ $t('hotelDetails.policy.age.text') }}</p>
              </div>
            </div>
            <div class="policy__condition--total">
              <div class="policy__condition--title">
                <i class="fa-solid fa-credit-card"></i>
                <strong>{{ $t('hotelDetails.policy.cash.title') }}</strong>
              </div>
              <div class="policy__condition--text">
                <p>{{ $t('hotelDetails.policy.cash.text') }}</p>
              </div>
            </div>
            <div class="policy__condition--total">
              <div class="policy__condition--title">
                <i class="fa-solid fa-ban-smoking"></i>
                <strong>{{ $t('hotelDetails.policy.smoking.title') }}</strong>
              </div>
              <div class="policy__condition--text">
                <p>{{ $t('hotelDetails.policy.smoking.text') }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- end policy -->
    <TheFooter />
  </div>
</template>

<style scoped>
.hotel-details-container {
  overflow-x: hidden;
  width: 100vw;
  height: 100vh;
}

.no-scoll {
  overflow-y: hidden;
}
/* menu  */
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

/* end menu  */

/* overview  */
.guest-room-dropdown {
  background: #fff;
  border: 1px solid #ccc;
  padding: 10px;
  position: absolute;
  width: 300px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-radius: 5px;
  margin-top: 5px;
}

.overview .counter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}

.overview .counter .number {
  margin: 0 10px;
}

.overview .counter span {
  font-size: 14px;
}

.overview .counter button {
  border: 1px solid #007bff;
  border-radius: 8px;
  width: 25px;
  height: 25px;
  font-size: 16px;
  cursor: pointer;
  background-color: #fff;
  display: inline-flex;
  align-items: center;
}

.overview .closeButton {
  margin-top: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px;
  width: 100%;
  border-radius: 5px;
  cursor: pointer;
}

.overview button[type='button'] {
  width: 100%;
  padding: 12px;
  margin-top: 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
  font-weight: bold;
}

.overview button[type='button']:hover {
  background-color: #0056b3;
}

.overview .map {
  margin: 10px 0;
  /* width: 300px; */
  height: 150px;
  border-radius: 5px;
  overflow: hidden;
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

.overview {
  margin-bottom: 10px;
}
.overview__total {
  display: flex;
  align-items: center;
}

.overview__image {
  flex: 1;
  /* margin-left: 30px; */
  height: 100%;
}

.overview__image--title {
  display: flex;
  justify-content: space-between;
  padding: 0 0 10px 0;
}

.overview__image--title button {
  color: #fff;
  background-color: #0056b3;
  font-weight: 500;
  border: none;
  cursor: pointer;
  border-radius: 5px;
  padding: 0 15px;
}

.overview__image--title h2 {
  margin: 0px;
}

.overview__image i {
  color: #0056b3;
}

.overview__image--header {
  display: flex;
  align-items: center;
}

/* end overview  */

/* information  */
.information {
  margin-bottom: 20px;
}

.information__total {
  display: flex;
}

.information__text {
  flex: 7;
  padding-right: 20px;
}

.information__text ul {
  display: flex;
  list-style-type: none;
  margin: 0;
  padding: 0;
  flex-wrap: wrap;
}

.information__text li {
  display: flex;
  margin-right: 20px;
  width: 20%;
  margin-bottom: 5px;
  flex-wrap: nowrap;
  align-items: center;
}

.information__text li i {
  color: green;
  margin-right: 10px;
}

.information__text li p {
  margin: 0;
  /* white-space: nowrap; */
  font-size: 13px;
}

/* end information  */

/* search */
.search-bar {
  margin-bottom: 15px;
  max-width: 70%;
  background-color: #ffb700;
  height: 40px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-sizing: border-box;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 9999;
}

.search-input {
  height: 100%;
  padding: 0 10px 0 40px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  background-repeat: no-repeat;
  background-position: 10px center;
  background-size: 16px;
  width: 30%;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>');
}

.date-picker {
  width: 40%;
  height: 90%;
}

/* Element Plus date range picker, styled to fit the yellow search bar. */
.date-picker :deep(.search-date-picker) {
  width: 100%;
  height: 100%;
}

.date-picker :deep(.el-date-editor) {
  height: 100%;
  padding: 0 10px;
  border: none;
  border-radius: 4px;
  box-shadow: none;
  font-size: 16px;
}

.date-picker :deep(.el-range-input) {
  font-size: 16px;
  color: #333;
}

.guest-room-wrapper {
  position: relative;
  display: inline-block;
  width: 40%;
  height: 90%;
}

.guest-room-wrapper input {
  width: 100%;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>');
}

#guest-room-selector {
  position: absolute;
  top: 100%;
  left: 0;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 10px;
  z-index: 100;
  width: 100%;
}

.guest-room-wrapper .selector-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.guest-room-wrapper .counter {
  display: flex;
  align-items: center;
}

.guest-room-wrapper button {
  width: 30px;
  height: 30px;
  font-size: 18px;
  text-align: center;
  line-height: 30px;
  border: 1px solid #007bff;
  background-color: #fff;
  color: #007bff;
  border-radius: 4px;
  cursor: pointer;
}

.guest-room-wrapper button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.guest-room-wrapper span {
  margin: 0 10px;
  font-size: 16px;
}

.search-button {
  background-color: #3576d2;
  color: #fff;
  border: none;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: bold;
  border-radius: 4px;
  font-size: 18px;
  width: 18%;
  height: 90%;
}

/* end search  */

/* price  */
table {
  width: 100%;
  border-collapse: collapse;
  font-family: Arial, sans-serif;
}
.table_header_3 {
  background-color: #003b95;
}
th {
  background-color: #4a73b6;
  color: white;
  padding: 12px;
  text-align: center;
  border: 1px solid #ddd;
  font-size: 14px;
}

td {
  padding: 12px;
  border: 1px solid #ddd;
  vertical-align: top;
  border-top: none;
}

.room-title {
  color: #0066cc;
  text-decoration: none;
  font-weight: bold;
}

.price {
  color: #333;
  font-weight: bold;
}

.tax-info {
  color: #666;
  font-size: 12px;
}

.service {
  list-style: none;
  padding: 0;
  margin: 0;
}

.service li {
  margin: 3px 0;
  padding-left: 20px;
  position: relative;
  font-size: 12px;
  color: gray;
}

.service li:before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #4caf50;
}

.room-info {
  color: #2f2f2f;
  font-size: 13px;
  padding: 5px;
}

select {
  padding: 2px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 100px;
}

.benefits {
  list-style: none;
  padding: 0;
}

.benefits li {
  margin: 5px 0;
  padding-left: 20px;
  position: relative;
  font-size: 12px;
  color: green;
}

.benefits li:before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #4caf50;
}
.price__content {
  padding: 0 5px;
  font-size: 13px;
  margin-top: 5px;
  top: 105px;
  position: sticky;
}
.price__content button {
  width: 100%;
  color: white;
  font-weight: 600;
  background-color: #007bff;
  border: none;
  border-radius: 5px;
  padding: 5px 0;
  margin-bottom: 5px;
}
.price__content ul {
  padding-left: 25px;
  margin-bottom: 5px;
}
.price__content b {
  color: green;
  margin-left: 5px;
}

.no-room-found {
  text-align: center;
  margin: 40px;
}

/* end price  */

/* review  */
.review__open {
  overflow-y: scroll;
  display: flex;
  justify-content: space-between;
  height: 100vh;
  width: 100vw;
  position: fixed;
  z-index: 9999;
  background-color: #00000056;
  top: 0px;
  /* display: none; */
}

.review__open--right {
  flex: 1;
  background-color: #fff;
  border-radius: 8px 0 0 8px;
  padding: 20px;
  height: fit-content;
}
.review__open--point {
  display: flex;
  align-items: center;
  position: relative;
}

.review__open--point div {
  margin-right: 30px;
  margin-left: 5px;
}

.review__open--point p {
  margin: 0;
  color: green;
}

.review__open .review__number ul {
  display: flex;
  margin: 0;
  list-style-type: none;
  padding: 0;
  justify-content: space-between;
}

.review__open .review__number ul p {
  margin-bottom: 5px;
}

.review__open .review__number select {
  width: 100%;
  border-radius: 5px;
  padding: 3px 5px;
}

/*  */
.review__open .review__number select:focus {
  border: 1px solid #ddd;
  outline: none;
}

.review__open .review__number li {
  width: 23%;
}
.review__open .review__number p {
  margin-top: 20px;
}
.review__open .review__number button {
  border-radius: 20px;
  padding: 5px 10px;
  margin-bottom: 5px;
  margin-right: 5px;
  border: 1px solid #000;
  background: #fff;
  display: inline-flex;
  align-items: center;
  display: none;
}

.review__open .review__number .visible {
  display: inline-block;
}

.review__open .review__number .smooth {
  border: none;
  border-radius: none;
}

.review__open .review__number .smooth:hover {
  background-color: #dddddd68;
}
.review__open .review__number .smooth2 {
  border: none;
  border-radius: none;
}

.review__open .review__number .smooth2:hover {
  background-color: #dddddd68;
}

.review__open .review__number button i {
  color: #777;
  margin-right: 3px;
}

.review__open .review__number .search {
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: inline-block;
}

.review__open--point button {
  position: absolute;
  right: 0px;
  border: 1px solid #007bff;
  padding: 5px 10px;
  font-size: 14px;
  color: #007bff;
  font-weight: 600;
  background-color: #fff;
  border-radius: 5px;
}

.review__open--point button:hover {
  background-color: #003c9510;
}

.review__open--left {
  width: 40%;
  height: 100%;
}

.review__open--right strong {
  font-size: 20px;
  display: inline-block;
  margin-bottom: 15px;
}

.review__open--point .point {
  padding: 10px;
  background-color: #0056b3;
  color: #fff;
  border-radius: 5px 5px 5px 0;
  font-size: 18px;
  font-weight: 600;
  margin-right: 6px;
}

.review__open--infor {
  width: 30%;
}

.review__open--infor .name {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.review__open--text {
  display: flex;
  margin-bottom: 20px;
}
.review__open--infor .name img {
  width: auto;
  height: 40px;
  border-radius: 50%;
  margin-right: 10px;
}

.pagination {
  padding: 10px 20px;
  border: 1px solid #007bff;
  border-radius: 10px;
}

.pagination button {
  margin-right: 10px;
  border: none;
  background-color: transparent;
  color: #007bff;
  padding: 5px 13px;
  border-radius: 5px;
}

.pagination button:hover {
  background-color: #007bff57;
  color: #fff;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination__status {
  font-size: 14px;
  color: #333;
}

.review__open .review__number--toggle {
  display: flex;
  align-items: flex-end;
}

.review__open .review__number--toggle label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  padding-bottom: 6px;
}

.review__open .review__number--search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.review__open .review__number--search input {
  flex: 1;
  border-radius: 5px;
  border: 1px solid #ccc;
  padding: 8px 10px;
}

.review__open .review__number--search button {
  display: inline-block;
  margin: 0;
}

.review__open--headline {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.review__open--headline span {
  font-size: 14px;
  color: #666;
}

.review__open--status {
  color: #666;
  padding: 10px 0;
}

.review__open--media {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.review__open--media img {
  width: 84px;
  height: 84px;
  object-fit: cover;
  border-radius: 6px;
}

.review__open--reply {
  background: #f4f7fb;
  border-left: 3px solid #0056b3;
  border-radius: 4px;
  padding: 10px 12px;
}

.review__open--reply p {
  margin: 4px 0 0;
}

.review__open--vote {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.review__open--vote button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #d0d7de;
  background: #fff;
  color: #333;
  border-radius: 20px;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 14px;
}

.review__open--vote button:hover {
  background: #f1f3f4;
}

.review__open--vote button.active {
  border-color: #0056b3;
  background: #e6f0fb;
  color: #0056b3;
  font-weight: 600;
}

.verified-badge {
  display: inline-block;
  margin-top: 4px;
  font-size: 12px;
  color: #137333;
}

.reviewer__meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #555;
}

.reviewer__score {
  background: #0056b3;
  color: #fff;
  border-radius: 4px;
  padding: 1px 6px;
  font-weight: 600;
}

.review__open--infor .service i {
  width: 24px;
  text-align: center;
  margin-right: 5px;
}

.review__open--infor .service {
  font-size: 13px;
}

.review__open--desc {
  flex: 1;
}
.review__open--desc .point {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.review__open--desc .text i {
  color: green;
}

.review__open--desc .text {
  margin-bottom: 20px;
}
.review__open--desc .point div p {
  margin-bottom: 5px;
}

.review__open--desc .point div strong {
  margin-bottom: 0;
}

.review__open--desc .point span {
  padding: 8px 10px;
  font-weight: 600;
  color: #fff;
  background-color: #0056b3;
  display: inline-block;
  border-radius: 5px 5px 5px 0;
}

.review__open--desc .button {
  float: right;
}

.review__open--desc .button button i {
  margin-right: 5px;
}

.review__open--desc .button button {
  border: none;
  border-radius: 5px;
  padding: 5px 13px;
  background: #fff;
  color: #007bff;
}

.review__open--desc .button button:hover {
  background-color: #007bff16;
}

.review {
  margin-top: 20px;
}

.review__point {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.review__point h3 {
  font-size: 24px;
  font-weight: bold;
}

.review__point .point {
  padding: 10px;
  font-weight: 600;
  color: #fff;
  background-color: #0056b3;
  display: inline-block;
  border-radius: 5px 5px 5px 0;
}

.review__point--right button {
  border: none;
  padding: 5px 10px;
  color: #fff;
  font-weight: 600;
  background-color: #007bff;
  border-radius: 5px;
}

.review__process--bar .category {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

.review__process--bar .process--bar {
  width: 100%;
  height: 10px;
  border-radius: 5px;
  background-color: #ddd;
  margin: 8px 0px;
  overflow: hidden;
}

.review__process--bar .process--bar .bar {
  background-color: #0056b3;
  height: 100%;
}

.review__process {
  margin-bottom: 10px;
}

.review__text {
  margin-top: 10px;
}

.reviewer {
  margin-top: 10px;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.reviewer .name {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 5px;
}

.reviewer .name img {
  width: auto;
  height: 64px;
  border-radius: 50%;
  margin-right: 10px;
}

.review .btnAll {
  margin-top: 20px;
  border: 1px solid #0056b3;
  background-color: transparent;
  color: #0056b3;
  font-weight: 600;
  padding: 10px 15px;
  border-radius: 5px;
}

.review .btnAll:hover {
  color: #fff;
  background-color: #0056b3;
}

/* end review */

/* surrounding */
.surrounding__total {
  margin-top: 40px;
}

.sur__title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.surrounding__name h3 {
  font-size: 24px;
  font-weight: bold;
}

.sur__button button {
  border: none;
  padding: 5px 10px;
  color: #fff;
  font-weight: 600;
  background-color: #007bff;
  border-radius: 5px;
}

.sur__have--item {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
}

.sur__have--item div {
  font-weight: 400;
  font-size: 13px;
}
/* end surrounding*/

/* policy */

.policy {
  margin: 40px 0px;
}
.policy__title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.policy__name h3 {
  font-size: 24px;
  font-weight: bold;
}

.policy__name {
  margin-bottom: 20px;
}

.policy__button button {
  border: none;
  padding: 5px 10px;
  color: #fff;
  font-weight: 600;
  background-color: #007bff;
  border-radius: 5px;
}

.policy__condition {
  border: 1px solid #ddd;
}

.policy__condition--total {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #dddd;
  padding: 20px 20px 20px 20px;
}

.policy__condition--title {
  padding-right: 40px;
  padding-left: 40px;
  width: 30%;
  display: flex;
  align-items: center;
}

.policy__condition--title i {
  margin-right: 10px;
}

.policy__condition--text {
  flex: 1;
  display: flex;
  justify-content: center;
  flex-direction: column;
}

/* end policy */
.gallery-container {
  padding-left: 0px !important;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.featured-images {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  height: 400px;
}

.featured-left {
  cursor: pointer;
  flex: 1;
}

.featured-right {
  cursor: pointer;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.featured-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.featured-right .featured-image {
  height: calc(50% - 10px);
}

.thumbnail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.thumbnail-item {
  position: relative;
  aspect-ratio: 4/3;
  overflow: hidden;
  border-radius: 8px;
  cursor: pointer;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.more-images {
  cursor: pointer;
}

.more-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
  font-weight: 600;
}

@media (max-width: 768px) {
  .featured-images {
    flex-direction: column;
    height: auto;
  }

  .featured-right {
    flex-direction: row;
  }

  .featured-right .featured-image {
    height: 200px;
    width: calc(50% - 10px);
  }
}
</style>
