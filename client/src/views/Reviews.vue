<script>
import TheHeader from '../components/Header.vue'
import SkeletonGrid from '@/components/common/SkeletonGrid.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { mapGetters, mapActions } from 'vuex'
import { useToast } from 'vue-toastification'
import errorHandler from '@/request/errorHandler'
import { ReviewService } from '@/services/review.service'
import { BookingService } from '@/services/booking.service'
import { getFirstImageUrl, getImageUrl } from '@/utils/images'

export default {
  components: {
    TheHeader,
    SkeletonGrid,
    EmptyState
  },
  setup() {
    const toast = useToast()
    return { toast }
  },
  data() {
    return {
      reviews: [],
      bookings: [],
      isLoading: false,
      viewMode: 'all'
    }
  },
  computed: {
    ...mapGetters('user', ['getUserInformation']),
    // Written reviews keyed by booking id.
    reviewsByBookingId() {
      const map = {}
      this.reviews.forEach((review) => {
        if (review.booking_id) {
          map[review.booking_id] = review
        }
      })
      return map
    },
    // Completed bookings the user hasn't reviewed yet.
    notReviewedBookings() {
      return this.bookings.filter(
        (booking) => booking.status === 'completed' && !this.reviewsByBookingId[booking.id]
      )
    },
    reviewed() {
      return this.reviews.length
    },
    notReviewed() {
      return this.notReviewedBookings.length
    },
    displayedReviews() {
      return this.viewMode === 'notReviewed' ? [] : this.reviews
    },
    displayedBookings() {
      return this.viewMode === 'reviewed' ? [] : this.notReviewedBookings
    }
  },
  methods: {
    ...mapActions('user', ['retrieveUserInformation']),
    async load() {
      this.isLoading = true
      try {
        const [reviewsResponse, bookingsResponse] = await Promise.all([
          ReviewService.getReviews().catch(() => ({ data: [] })),
          BookingService.getBookings(true).catch(() => ({ data: [] }))
        ])
        this.reviews = reviewsResponse?.data ?? []
        this.bookings = bookingsResponse?.data ?? []
      } catch (error) {
        errorHandler(error)
      } finally {
        this.isLoading = false
      }
    },
    makeReview(bookingCode, hotelId, hotelName) {
      this.$router.push({
        name: 'ReviewDetails',
        query: { bc: bookingCode, hid: hotelId, hn: hotelName }
      })
    },
    getFirstImageUrl,
    getImageUrl
  },
  async mounted() {
    await Promise.all([
      this.load(),
      this.retrieveUserInformation().catch(() => {})
    ])
  }
}
</script>
<template>
  <TheHeader :isSearchOpen="false" />
  <div class="review-dashboard">
    <div class="left-container">
      <div class="profile-section">
        <img v-if="getUserInformation" :src="getImageUrl(getUserInformation.profile_picture_url)" alt="Profile" class="profile-image" />
        <div>
          <h2 class="profile-name" v-if="getUserInformation">{{ getUserInformation.username }}</h2>
          <a class="edit-profile" @click="this.$router.push('/account-settings/personal-information')">Edit your profile</a>
        </div>
      </div>

      <div class="nav-links">
        <a class="nav-link" :class="{ selected: viewMode === 'all' }" @click="viewMode = 'all'">
          All reviews
          <span class="review-count">{{ reviews.length }}</span>
        </a>
        <a
          class="nav-link"
          :class="{ selected: viewMode === 'notReviewed' }"
          @click="viewMode = 'notReviewed'"
        >
          Not reviewed yet
          <span class="review-count">{{ notReviewed }}</span>
        </a>
        <a
          class="nav-link"
          :class="{ selected: viewMode === 'reviewed' }"
          @click="viewMode = 'reviewed'"
        >
          Reviewed
          <span class="review-count">{{ reviewed }}</span>
        </a>
      </div>
    </div>
    <div class="right-container">
      <SkeletonGrid v-if="isLoading" :count="2" image-height="125px" />
      <EmptyState
        v-else-if="displayedReviews.length === 0 && displayedBookings.length === 0"
        title="No reviews yet"
        message="Complete a stay to leave a review."
        icon="fa-regular fa-star"
      />
      <template v-else>
        <!-- Stays awaiting a review -->
        <div class="review-card" v-for="booking in displayedBookings" :key="booking.id">
          <div style="display: flex; gap: 16px; align-items: start">
            <img
              :src="getFirstImageUrl(booking.hotel?.image_urls)"
              alt="Property"
              class="property-image"
            />
            <div class="review-content">
              <h4>You haven't reviewed your stay at {{ booking.hotel?.name }}</h4>
              <div>
                <span>You only have 60 days left to review.</span>
              </div>
              <button
                class="review-button"
                @click="makeReview(booking.booking_code, booking.hotel?.id, booking.hotel?.name)"
              >
                Review your stay
              </button>
            </div>
          </div>
        </div>

        <!-- Written reviews -->
        <div class="review-card" v-for="review in displayedReviews" :key="review.id">
          <div style="display: flex; gap: 16px; align-items: start">
            <img
              :src="getFirstImageUrl(review.hotel?.image_urls)"
              alt="Property"
              class="property-image"
            />
            <div class="review-content">
              <h4>You reviewed your stay at {{ review.hotel?.name }}</h4>
              <div>
                <span class="review-status">Reviewed</span>
              </div>
              <p v-if="review.title"><strong>{{ review.title }}</strong></p>
              <p v-if="review.comment">{{ review.comment }}</p>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
<style scoped>
.review-dashboard {
  /* max-width: 1200px; */
  margin: 30px 40px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.left-container {
  width: 30%;
}

.right-container {
  width: 70%;
}

.profile-section {
  display: flex;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.profile-image {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin-right: 12px;
  object-fit: cover;
}

.profile-name {
  font-size: 18px;
  font-weight: 500;
  margin: 0;
}

.edit-profile {
  color: #1a73e8;
  text-decoration: none;
  font-size: 14px;
}

.nav-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: white;
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.nav-link {
  display: flex;
  justify-content: space-between;
  padding: 8px 16px;
  color: #1a73e8;
  text-decoration: none;
  border-radius: 4px;
}

.nav-link:hover {
  background: #f1f3f4;
}

.review-count {
  color: #1a73e8;
  font-weight: 500;
}

.review-card {
  background: white;
  padding: 16px;
  /* margin: 16px 0; */
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.property-image {
  width: 125px;
  height: 125px;
  border-radius: 4px;
  object-fit: cover;
  align-self: center;
}

.review-button {
  background: #1a73e8;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  bottom: 0px;
}

.review-status {
  display: inline-block;
  padding: 4px 8px;
  background: #e6f4ea;
  color: #137333;
  border-radius: 4px;
  font-size: 12px;
}

.score-badge {
  background: #1a73e8;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
}

.exceptional-text {
  font-weight: 500;
  margin-left: 8px;
}

.review-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  width: 100%;
  height: 100%;
}

.selected {
  border-left: 4px solid #1a73e8;
}

@media (max-width: 768px) {
  .review-dashboard {
    flex-direction: column;
    margin: 20px 16px;
    gap: 16px;
  }

  .left-container,
  .right-container {
    width: 100%;
  }
}
</style>
