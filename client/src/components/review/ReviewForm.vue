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
        this.toast.success(this.$t('reviewsPage.form.postSuccess'))
        this.$emit('close-review-form')
      } catch (error) {
        this.toast.error(this.$t('reviewsPage.form.postError'))
      }
    }
  }
}
</script>
<template>
  <div class="popup">
    <div class="popup-content">
      <h2>{{ $t('reviewsPage.form.title') }}</h2>
      <form @submit.prevent="postReview">
        <label for="rating">{{ $t('reviewsPage.form.ratingLabel') }}</label>
        <select id="rating" name="rating" v-model="rating">
          <option value="5">{{ $t('reviewsPage.form.rating5') }}</option>
          <option value="4">{{ $t('reviewsPage.form.rating4') }}</option>
          <option value="3">{{ $t('reviewsPage.form.rating3') }}</option>
          <option value="2">{{ $t('reviewsPage.form.rating2') }}</option>
          <option value="1">{{ $t('reviewsPage.form.rating1') }}</option>
        </select>

        <label for="title">{{ $t('reviewsPage.form.titleLabel') }}</label>
        <input
          type="text"
          id="title"
          name="title"
          :placeholder="$t('reviewsPage.form.titlePlaceholder')"
          required
        />

        <label for="review">{{ $t('reviewsPage.form.reviewLabel') }}</label>
        <textarea
          id="review"
          name="review"
          rows="5"
          v-model="review"
          :placeholder="$t('reviewsPage.form.reviewPlaceholder')"
          required
        ></textarea>

        <div class="buttons">
          <button type="button" class="close-btn" @click="$emit('close-review-form')">{{ $t('reviewsPage.form.close') }}</button>
          <button type="submit" class="submit-btn">{{ $t('reviewsPage.form.submit') }}</button>
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
