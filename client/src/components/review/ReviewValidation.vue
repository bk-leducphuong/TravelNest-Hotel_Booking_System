<script>
  import sectionFeedback from '@/mixins/sectionFeedback';
  import { ReviewService } from '@/services/review.service';

  export default {
    mixins: [sectionFeedback],
    props: {
      hotelId: {
        type: String,
        required: true,
      },
      hotelName: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        bookingCode: null,
      };
    },
    methods: {
      // validate user who booked the room before writing a review
      async validateUser() {
        try {
          const response = await ReviewService.validateReview({
            bookingCode: this.bookingCode,
            hotelId: this.hotelId,
          });

          if (response?.data?.isValid) {
            this.$emit('close');
            this.$router.push({
              path: '/reviews/review-details',
              query: {
                bc: this.bookingCode,
                hid: this.hotelId,
                hn: this.hotelName,
              },
            });
          } else {
            this.showError(this.$t('reviewsPage.validation.bookingNotFound'));
          }
        } catch (error) {
          this.showError(this.$t('reviewsPage.validation.bookingNotFound'));
        }
      },
    },
  };
</script>
<template>
  <div class="popup">
    <div class="popup-content">
      <FeedbackMessage v-if="feedback" v-bind="feedback" @dismiss="clearFeedback" />
      <i class="fa fa-times close-btn" aria-hidden="true" @click="$emit('close')"></i>
      <h2>{{ $t('reviewsPage.validation.title') }}</h2>
      <p>{{ $t('reviewsPage.validation.hint') }}</p>
      <form @submit.prevent="validateUser">
        <label for="room-number">{{ $t('reviewsPage.validation.bookingCode') }}</label>
        <input type="text" id="room-number" name="room-number" v-model="bookingCode" />
        <label for="pin">{{ $t('reviewsPage.validation.pin') }}</label>
        <input type="text" id="pin" name="pin" />
        <button type="submit">{{ $t('reviewsPage.validation.submit') }}</button>
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
    position: relative;
    border-radius: 20px;
    background-color: #fefefe;
    padding: 20px;
    border: 1px solid #888;
    width: 80%;
    max-width: 500px;
  }

  .popup-content h2 {
    margin-top: 0;
    font-size: 20px;
  }

  .popup-content form {
    display: flex;
    flex-direction: column;
  }

  .popup-content input {
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 5px;
    border: 1px solid #ccc;
  }

  .popup-content button {
    background-color: #007bff;
    color: #fff;
    border: none;
    padding: 10px 20px;
    cursor: pointer;
    border-radius: 5px;
    font-size: 16px;
  }
  .close-btn {
    position: absolute;
    top: 10px;
    right: 15px;
    font-size: 25px;
    cursor: pointer;
  }
</style>
