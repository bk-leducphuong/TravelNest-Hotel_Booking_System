<script>
import TheHeader from '@/components/Header.vue'
import errorHandler from '@/request/errorHandler'
import { useToast } from 'vue-toastification'
import { ReviewService } from '@/services/review.service'

// Map the UI criteria names to the API's rating fields (1-10).
const CRITERIA_TO_RATING = {
  Cleanliness: 'cleanliness',
  Staff: 'service',
  Location: 'location',
  'Value for money': 'value'
}

export default {
  components: {
    TheHeader
  },
  setup() {
    const toast = useToast()
    return { toast }
  },
  data() {
    return {
      reviewCriteria: [
        { name: 'Cleanliness', value: null },
        { name: 'Staff', value: null },
        { name: 'Facilities', value: null },
        { name: 'Comfort', value: null },
        { name: 'Location', value: null },
        { name: 'Value for money', value: null }
      ],
      overallRating: null,
      comment: null,
      isSubmitting: false
    }
  },
  computed: {
    bookingCode() {
      return this.$route.query.bc
    },
    hotelId() {
      return this.$route.query.hid
    }
  },
  methods: {
    async validateReview() {
      try {
        const response = await ReviewService.validateReview({
          bookingCode: this.bookingCode,
          hotelId: this.hotelId
        })
        if (!response?.data?.isValid) {
          this.toast.error('This booking is not eligible for review')
          this.$router.push('/reviews')
        }
      } catch (error) {
        errorHandler(error)
        this.$router.push('/reviews')
      }
    },
    async checkAlreadyReviewed() {
      try {
        const response = await ReviewService.checkReview({
          bookingCode: this.bookingCode,
          hotelId: this.hotelId
        })
        if (response?.data?.exists) {
          this.toast.info('You have already reviewed this stay')
          this.$router.push('/reviews')
        }
      } catch (error) {
        errorHandler(error)
      }
    },
    // The UI uses a 1-5 emoji scale; the API expects 1-10.
    buildRatings() {
      const ratings = {}
      if (this.overallRating != null) {
        ratings.overall = Number(this.overallRating) * 2
      }
      this.reviewCriteria.forEach((criteria) => {
        const key = CRITERIA_TO_RATING[criteria.name]
        if (key && criteria.value != null) {
          ratings[key] = Number(criteria.value) * 2
        }
      })
      return ratings
    },
    checkValidReview() {
      return this.overallRating != null && Boolean(this.comment)
    },
    async postReview() {
      if (!this.checkValidReview()) {
        this.toast.error('Please fill in all the required fields')
        return
      }

      this.isSubmitting = true
      try {
        await ReviewService.createReview({
          hotelId: this.hotelId,
          bookingCode: this.bookingCode,
          ratings: this.buildRatings(),
          comment: this.comment
        })

        this.toast.success('Review posted successfully')
        this.$router.push('/reviews')
      } catch (error) {
        errorHandler(error)
        this.$router.push('/reviews')
      } finally {
        this.isSubmitting = false
      }
    }
  },
  async mounted() {
    await this.validateReview()
    await this.checkAlreadyReviewed()
  }
}
</script>
<template>
  <TheHeader :isSearchOpen="false" />
  <div class="review-container">
    <div class="review-section">
      <h3>Review {{ this.$route.query.hn }}</h3>
      <p>Let me know how your stay was.</p>
    </div>
    <!-- Section 1: Service Rating -->
    <div class="review-section">
      <h3>Rate Our Services (optional)</h3>
      <div v-for="criteria in reviewCriteria" :key="criteria.name">
        <label>{{ criteria.name }}</label>
        <div class="rating-group faces">
          <input type="radio" v-model="criteria.value" value="1" :id="`${criteria.name}-1`" />
          <label :for="`${criteria.name}-1`" :class="{ selected: criteria.value == 1 }">😡</label>
          <input type="radio" v-model="criteria.value" value="2" :id="`${criteria.name}-2`" />
          <label :for="`${criteria.name}-2`" :class="{ selected: criteria.value == 2 }">😟</label>
          <input type="radio" v-model="criteria.value" value="3" :id="`${criteria.name}-3`" />
          <label :for="`${criteria.name}-3`" :class="{ selected: criteria.value == 3 }">😐</label>
          <input type="radio" v-model="criteria.value" value="4" :id="`${criteria.name}-4`" />
          <label :for="`${criteria.name}-4`" :class="{ selected: criteria.value == 4 }">😊</label>
          <input type="radio" v-model="criteria.value" value="5" :id="`${criteria.name}-5`" />
          <label :for="`${criteria.name}-5`" :class="{ selected: criteria.value == 5 }">😍</label>
        </div>
      </div>
    </div>

    <!-- Section 2: Overall Rating -->
    <div class="review-section">
      <h3>Overall Rating</h3>
      <p>How was your stay experienced at this hotel?</p>
      <div class="rating-group faces">
        <input type="radio" v-model="overallRating" value="1" :id="`overall-1`" />
        <label :for="`overall-1`" :class="{ selected: overallRating == 1 }">😡</label>
        <input type="radio" v-model="overallRating" value="2" :id="`overall-2`" />
        <label :for="`overall-2`" :class="{ selected: overallRating == 2 }">😟</label>
        <input type="radio" v-model="overallRating" value="3" :id="`overall-3`" />
        <label :for="`overall-3`" :class="{ selected: overallRating == 3 }">😐</label>
        <input type="radio" v-model="overallRating" value="4" :id="`overall-4`" />
        <label :for="`overall-4`" :class="{ selected: overallRating == 4 }">😊</label>
        <input type="radio" v-model="overallRating" value="5" :id="`overall-5`" />
        <label :for="`overall-5`" :class="{ selected: overallRating == 5 }">😍</label>
      </div>
    </div>

    <!-- Section 3: Comments -->
    <div class="review-section">
      <h3>Write Your Comments</h3>
      <p>Please write your reviews about your feeling during staying at this hotel.</p>
      <textarea name="comments" id="comments" v-model="comment" placeholder="Write your feedback here..."></textarea>
      <div style="display: flex; align-items: center; gap: 5px">
        <input type="checkbox" name="booking_code" value="bc" style="width: 18px; height: 18px" />
        <span for="booking_code">Post this review as a anonymous</span>
      </div>
    </div>

    <!-- Submit Button -->
    <button type="submit" @click="postReview">Submit Review</button>
  </div>
</template>
<style scoped>
.review-container {
  margin: 40px;
}

.review-section {
  margin: 20px auto;
  padding: 20px;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 8px;
}
h1 {
  text-align: center;
  margin-bottom: 20px;
}
.section-container {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
}
h3 {
  margin-bottom: 15px;
}
.rating-group {
  display: flex;
  justify-content: space-around;
  align-items: center;
  margin: 10px 0;
}
.faces input {
  display: none;
}
.faces label {
  font-size: 2rem;
  cursor: pointer;
  transition: transform 0.2s;
}
.faces label:hover {
  transform: scale(1.2);
}

.selected {
  transform: scale(1.3);
  color: #007bff;
  border: #007bff solid 2px;
  border-radius: 50%;
}

textarea {
  width: 100%;
  min-height: 200px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: vertical;
}
button {
  width: 100%;
  padding: 10px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}
button:hover {
  background: #0056b3;
}
</style>
