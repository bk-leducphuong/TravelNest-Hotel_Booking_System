<script>
import user from '@/stores/user';
import { mapGetters } from 'vuex'
import axios from 'axios';
import { useToast } from 'vue-toastification';
export default {
  setup() {
    const toast = useToast()
    return {toast}
  },
  data() {
    return {
      review: null,
      rating: null
    }
  },
  computed: {
    ...mapGetters('auth', ['getUserId'])
  },
  methods: {
    async postReview() {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/review/post-review`,
          {
            hotelId: this.$route.params.hotel_id,
            rating: this.rating,
            comment: this.review,
            userId: this.getUserId
          },
          {
            withCredentials: true
          }
        )
        this.toast.success('Review posted successfully!')
        this.$emit('close-review-form')
      } catch (error) {
        this.toast.error('Error posting review!')
      }
    }
  }
}
</script>
<template>
  <div class="popup">
    <div class="popup-content">
      <h2>Write a Review</h2>
      <form @submit.prevent="postReview">
        <label for="rating">Rating:</label>
        <select id="rating" v-model="rating" name="rating">
          <option value="5">5 - Excellent</option>
          <option value="4">4 - Very Good</option>
          <option value="3">3 - Average</option>
          <option value="2">2 - Below Average</option>
          <option value="1">1 - Poor</option>
        </select>

        <label for="title">Review Title:</label>
        <input
          id="title"
          type="text"
          name="title"
          placeholder="Enter a title for your review"
          required
        />

        <label for="review">Review:</label>
        <textarea
          id="review"
          v-model="review"
          name="review"
          rows="5"
          placeholder="Share your thoughts about your stay"
          required
        ></textarea>

        <div class="buttons">
          <button type="button" class="close-btn" @click="$emit('close-review-form')">Close</button>
          <button type="submit" class="submit-btn">Submit Review</button>
        </div>
      </form>
    </div>
  </div>
</template>
<style scoped>
.popup {
  position: fixed;
  z-index: 99999999;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
}

.popup-content {
  border-radius: 20px;
  background-color: #fefefe;
  padding: 20px;
  border: 1px solid #888;
  width: 80%;
  max-width: 500px;
}

.popup-content h2 {
  margin-top: 0;
}

.popup-content form {
  display: flex;
  flex-direction: column;
}

.popup-content label {
  font-weight: bold;
  margin-bottom: 5px;
}

.popup-content input,
.popup-content textarea,
.popup-content select {
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.popup-content .buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

.popup-content .submit-btn {
  background-color: #007bff;
  color: white;
  border-radius: 5px;
  font-size: 16px;
  border: 1px solid #007bff;
  font-weight: bold;
  padding: 10px 20px;
  cursor: pointer;
}

.popup-content .close-btn {
  background-color: #007bff;
  color: white;
  border-radius: 5px;
  font-size: 16px;
  border: 1px solid #007bff;
  font-weight: bold;
  padding: 10px 20px;
  cursor: pointer;
  margin-left: 10px;
}
</style>
