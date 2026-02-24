<script>
import axios from 'axios'
import DashboardMenu from '@/components/admin/DashboardMenu.vue'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import { mapActions, mapGetters } from 'vuex'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/css/index.css'
import { useToast } from 'vue-toastification'
import errorHandler from '@/request/errorHandler'

export default {
  components: {
    DashboardMenu,
    AdminHeader,
    Loading
  },
  setup() {
    const toast = useToast()
    return { toast }
  },
  data() {
    return {
      isLoading: false,
      reviews: [],
      displayReviews: [],
      replies: [],
      viewMode: 'all' // all, with-comments, without-replies
    }
  },
  computed: {
    ...mapGetters('manageHotels', ['getCurrentManagingHotelId'])
  },
  watch: {
    viewMode(newValue) {
      switch (newValue) {
        case 'all':
          this.displayReviews = this.reviews
          break
        case 'with-comments':
          // get all reviews which have a comment
          this.displayReviews = this.reviews.filter((review) => review.comment)
          break
        case 'without-replies':
          // get all reviews which have no reply
          this.displayReviews = this.reviews.filter((review) => !review.reply)
          break
      }
    }
  },
  methods: {
    async getAllReviews() {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/review/get-all-reviews`,
          {
            hotelId: this.getCurrentManagingHotelId
          },
          {
            withCredentials: true
          }
        )
        this.reviews = response.data
        this.reviews.forEach((review) => {
          this.replies[review.review_id] = review.reply
        })
      } catch (error) {
        errorHandler(error);
      }
    },
    replyToReview(reviewId) {
      this.$refs[`write-reply-${reviewId}`][0].style.display = 'block' // open the write reply section
      this.$refs[`save-reply-${reviewId}`][0].style.display = 'inline' // show the save button
    },
    async saveReply(reviewId) {
      try {
        this.$refs[`write-reply-${reviewId}`][0].style.display = 'none' // hide the write reply section
        this.$refs[`save-reply-${reviewId}`][0].style.display = 'none' // hide the save button

        this.reviews.forEach((review) => {
          if (review.review_id == reviewId) {
            review.reply = this.replies[reviewId]
          }
        })

        if (this.$refs[`reply-${reviewId}`]) {
          this.$refs[`reply-${reviewId}`][0].style.display = 'block' // show the reply section
        }

        if (this.replies[reviewId]) {
          await axios.post(
            `${import.meta.env.VITE_SERVER_HOST}/api/admin/review/reply-to-review`,
            {
              reviewId: reviewId,
              reply: this.replies[reviewId]
            },
            {
              withCredentials: true
            }
          )
        }
      } catch (error) {
        errorHandler(error);
      }
    },
    editReply(reviewId) {
      this.$refs[`write-reply-${reviewId}`][0].style.display = 'block' // open the write reply section
      this.$refs[`save-reply-${reviewId}`][0].style.display = 'inline' // show the save button
      this.$refs[`reply-${reviewId}`][0].style.display = 'none' // hide the reply section
    }
  },
  async mounted() {
    this.isLoading = true
    await this.getAllReviews()
    this.displayReviews = this.reviews // default view mode is all reviews
    this.isLoading = false
  }
}
</script>
<template>
  <div class="review-container">
    <DashboardMenu />
    <div class="main-wrapper">
      <!-- top header -->
      <AdminHeader />
      <!-- main content -->
      <div class="main-content">
        <Loading
          v-model:active="isLoading"
          :can-cancel="true"
          :on-cancel="onCancel"
          :color="`#003b95`"
          :is-full-page="false"
        />
        <h2>
          <strong>Guest reviews</strong>
        </h2>
        <div class="main-container">
          <!-- Filters Section -->
          <div class="filters-section">
            <h3>Select a score:</h3>
            <ul>
              <li><input type="radio" name="score" checked /> All review scores</li>
              <li><input type="radio" name="score" /> Wonderful: 9+</li>
              <li><input type="radio" name="score" /> Good: 7-9</li>
              <li><input type="radio" name="score" /> Average: 5-7</li>
              <li><input type="radio" name="score" /> Poor: 3-5</li>
              <li><input type="radio" name="score" /> Very Poor: 1-3</li>
            </ul>
            <h3>Select a traveler type:</h3>
            <ul>
              <li><input type="radio" name="traveler" checked /> All reviewers</li>
              <li><input type="radio" name="traveler" /> Business travelers</li>
              <li><input type="radio" name="traveler" /> Couples</li>
              <li><input type="radio" name="traveler" /> Families</li>
              <li><input type="radio" name="traveler" /> Groups</li>
            </ul>
          </div>

          <!-- Reviews Section -->
          <div class="reviews-section">
            <div class="action-bar">
              <div class="switch-toggle switch-3 switch-candy" id="1">
                <span :class="{ active: viewMode === 'all' }" @click="viewMode = 'all'"
                  >All reviews</span
                >
                <span
                  :class="{ active: viewMode === 'with-comments' }"
                  @click="viewMode = 'with-comments'"
                  >With comments</span
                >
                <span
                  :class="{ active: viewMode === 'without-replies' }"
                  @click="viewMode = 'without-replies'"
                  >Without replies</span
                >
              </div>
              <select class="bulk-action">
                <option value="all">Mới nhất</option>
                <option value="today">Hôm nay</option>
                <option value="last-week">1 tuần trước</option>
                <option value="last-month">1 tháng trước</option>
                <option value="last-year">1 năm trước</option>
              </select>
            </div>

            <div class="reviews">
              <div class="review-card" v-for="review in displayReviews" :key="review.review_id">
                <div class="review-header">
                  <span class="score">{{ review.rating }}</span>
                  <div>
                    <div>
                      <strong>{{ review.user_name }}</strong> (<span>{{ review.user_email }}</span
                      >)
                    </div>
                    <div>Booking code: {{ review.booking_code }}</div>
                  </div>
                </div>
                <div class="review-date">
                  Review date: {{ new Date(review.created_at).toLocaleDateString() }}
                </div>
                <br />
                <div class="review-details" v-if="review.review_criteria.length > 0">
                  <p v-for="criteria in review.review_criteria" :key="criteria.criteria_name">
                    {{ criteria.criteria_name }}: <span class="bar"><span :style="{ width: criteria.score / 5 * 100 + '%' }"></span></span>
                  </p>
                </div>
                <div class="review-details" v-else>
                  <p v-if="review.rating >= 3">Đã đánh giá khách sạn của bạn tốt</p>
                  <p v-else>Đã đánh giá khách sạn của bạn chưa tốt</p>
                </div>
                <div class="line-break"></div>
                <!-- show the comment -->
                <div class="comment-section" v-if="viewMode !== 'all'">
                  <h4>
                    <strong>We love this place!</strong>
                  </h4>
                  <p>
                    {{ review.comment }}
                  </p>
                </div>
                <!-- write your reply -->
                <div class="reply-section" v-if="viewMode !== 'all'">
                  <button
                    @click="replyToReview(review.review_id)"
                    v-if="!replies[review.review_id]"
                  >
                    Reply
                  </button>
                  <button
                    @click="saveReply(review.review_id)"
                    style="background-color: #007bff; color: #fff; display: none"
                    :ref="`save-reply-${review.review_id}`"
                  >
                    Save
                  </button>
                  <div
                    class="write-reply"
                    :ref="`write-reply-${review.review_id}`"
                    style="display: none"
                  >
                    <label for="comment">Write your reply here...</label>
                    <textarea
                      v-model="replies[review.review_id]"
                      id="comment"
                      name="comment"
                      rows="5"
                      placeholder="Write your review here..."
                      required
                    ></textarea>
                  </div>
                </div>
                <!-- show your reply -->
                <div
                  class="comment-section"
                  v-if="viewMode !== 'all' && review.reply"
                  :ref="`reply-${review.review_id}`"
                >
                  <i
                    class="fa-solid fa-pen-to-square"
                    @click="editReply(review.review_id)"
                    style="
                      font-size: 20px;
                      position: absolute;
                      top: 10px;
                      right: 10px;
                      cursor: pointer;
                    "
                  ></i>
                  <h4>
                    <strong>Your reply</strong>
                  </h4>
                  <p>
                    {{ review.reply }}
                  </p>
                </div>
              </div>
              <!-- Add more review cards as needed -->
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.review-container {
  display: flex;
}
/* Main Content Styles */
.main-wrapper {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.main-content {
  padding: 24px;
  position: relative;
}

.main-container {
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 0px !important;
  gap: 20px !important;
}

.filters-section {
  width: 25%;
  background: #fff;
  padding: 20px;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.filters-section h3 {
  font-size: 1.2em;
  margin-bottom: 10px;
}

.filters-section ul {
  list-style: none;
  padding: 0;
}

.filters-section li {
  margin-bottom: 10px;
}

.filters-section input {
  margin-right: 10px;
}

.reviews-section {
  width: 75%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  /* align-items: center; */
}

.bulk-action {
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  color: #718096;
  cursor: pointer;
}

.review-card {
  background: #fff;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.review-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.score {
  background-color: #007bff;
  color: #fff;
  font-weight: bold;
  padding: 10px;
  border-radius: 5px;
}

.review-date {
  font-size: 0.9em;
  color: #666;
}

.review-details p {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.bar {
  flex: 1;
  height: 8px;
  background: #e0e0e0;
  margin-left: 10px;
  border-radius: 5px;
  position: relative;
  overflow: hidden;
}

.bar span {
  display: block;
  height: 100%;
  background: #007bff;
  border-radius: 5px;
}

.switch-toggle {
  float: left;
  background: none;
  border: #4285f4 2px solid;
  border-left: none;
  border-radius: 5px;
  position: relative;
}

.switch-3 {
  display: flex;
  /* justify-content: space-between; */
}

.switch-toggle span {
  display: block;
  /* width: 50%; */
  float: left;
  text-align: center;
  cursor: pointer;
  color: #4285f4;
  padding: 10px 15px;
  border-left: #2196f3 solid 2px;
}

.active {
  background: #4285f4;
  color: white !important;
}

.line-break {
  height: 1px;
  background-color: #e2e8f0;
  margin: 20px 0;
}

.comment-section {
  padding: 20px;
  background-color: #fff;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  position: relative;
}

.reply-section {
  margin: 20px 0;
}
.reply-section button {
  border: 2px solid #007bff;
  background-color: #fff;
  color: #007bff;
  padding: 5px;
  border-radius: 5px;
  margin-right: 15px;
}

.reply-section button:hover {
  background-color: #007bff;
  color: #fff;
}

.reply-section textarea {
  width: 100%;
  border: 2px solid #e2e8f0;
}
</style>
