<script>
  import TheFooter from '@/components/Footer.vue';
  import TheHeader from '@/components/Header.vue';
  import sectionFeedback from '@/mixins/sectionFeedback';
  import { ReviewService } from '@/services/review.service';

  // Map the UI criteria names to the API's rating fields (1-10).
  const CRITERIA_TO_RATING = {
    Cleanliness: 'cleanliness',
    Staff: 'service',
    Location: 'location',
    'Value for money': 'value',
  };

  export default {
    mixins: [sectionFeedback],
    components: {
      TheHeader,
      TheFooter,
    },
    data() {
      return {
        reviewCriteria: [
          { name: 'Cleanliness', labelKey: 'reviewsPage.criteria.cleanliness', value: null },
          { name: 'Staff', labelKey: 'reviewsPage.criteria.staff', value: null },
          { name: 'Location', labelKey: 'reviewsPage.criteria.location', value: null },
          { name: 'Value for money', labelKey: 'reviewsPage.criteria.valueForMoney', value: null },
        ],
        overallRating: null,
        comment: null,
        isEligible: false,
        isSubmitting: false,
      };
    },
    computed: {
      bookingCode() {
        return this.$route.query.bc;
      },
      hotelId() {
        return this.$route.query.hid;
      },
    },
    methods: {
      async validateAndCheck() {
        this.clearFeedback();
        await this.validateReview();
        if (this.isEligible) await this.checkAlreadyReviewed();
      },
      async validateReview() {
        try {
          const response = await ReviewService.validateReview({
            bookingCode: this.bookingCode,
            hotelId: this.hotelId,
          });
          this.isEligible = Boolean(response?.data?.isValid);
          if (!this.isEligible) {
            this.showError(this.$t('reviewsPage.notEligible'));
          }
        } catch (error) {
          this.isEligible = false;
          this.showError();
          this.feedback.retryable = true;
        }
      },
      async checkAlreadyReviewed() {
        try {
          const response = await ReviewService.checkReview({
            bookingCode: this.bookingCode,
            hotelId: this.hotelId,
          });
          if (response?.data?.exists) {
            this.isEligible = false;
            this.showInfo(this.$t('reviewsPage.alreadyReviewed'));
          }
        } catch (error) {
          this.isEligible = false;
          this.showError();
          this.feedback.retryable = true;
        }
      },
      // The UI uses a 1-5 emoji scale; the API expects 1-10.
      buildRatings() {
        const ratings = {};
        if (this.overallRating != null) {
          ratings.overall = Number(this.overallRating) * 2;
        }
        this.reviewCriteria.forEach((criteria) => {
          const key = CRITERIA_TO_RATING[criteria.name];
          if (key && criteria.value != null) {
            ratings[key] = Number(criteria.value) * 2;
          }
        });
        return ratings;
      },
      checkValidReview() {
        return this.overallRating != null && Boolean(this.comment);
      },
      async postReview() {
        if (this.isSubmitting || !this.isEligible) return;
        if (!this.checkValidReview()) {
          this.showError(this.$t('reviewsPage.fillRequired'));
          return;
        }

        this.isSubmitting = true;
        try {
          await ReviewService.createReview({
            hotelId: this.hotelId,
            bookingCode: this.bookingCode,
            ratings: this.buildRatings(),
            comment: this.comment,
          });

          await this.confirmSuccess(this.$t('reviewsPage.postSuccess'));
          this.$router.push('/reviews');
        } catch (error) {
          this.showError();
        } finally {
          this.isSubmitting = false;
        }
      },
    },
    async mounted() {
      await this.validateAndCheck();
    },
  };
</script>
<template>
  <TheHeader :is-search-open="false" />
  <main id="guest-main" tabindex="-1" class="guest-page review-form-page">
    <FeedbackMessage
      v-if="feedback"
      v-bind="feedback"
      @dismiss="clearFeedback"
      @retry="validateAndCheck"
    />
    <RouterLink to="/reviews">← {{ $t('account.menu.reviews') }}</RouterLink>
    <h1 class="guest-page-title">
      {{ $t('reviewsPage.reviewTitle', { hotel: $route.query.hn }) }}
    </h1>
    <p class="guest-subtitle">{{ $t('reviewsPage.reviewSubtitle') }}</p>
    <form v-if="isEligible" class="guest-section guest-form" @submit.prevent="postReview">
      <fieldset v-for="criteria in reviewCriteria" :key="criteria.name">
        <legend>{{ $t(criteria.labelKey) }}</legend>
        <div class="rating-choices">
          <label v-for="n in 5" :key="n"
            ><input v-model="criteria.value" type="radio" :name="criteria.name" :value="n" />{{
              n * 2
            }}/10</label
          >
        </div>
      </fieldset>
      <fieldset>
        <legend>{{ $t('reviewsPage.overallRating') }}</legend>
        <div class="rating-choices">
          <label v-for="n in 5" :key="n"
            ><input v-model="overallRating" type="radio" name="overall" :value="n" required />{{
              n * 2
            }}/10</label
          >
        </div>
      </fieldset>
      <label for="review-comment"
        >{{ $t('reviewsPage.writeComments')
        }}<textarea
          id="review-comment"
          v-model.trim="comment"
          required
          maxlength="5000"
          rows="6"
          :placeholder="$t('reviewsPage.feedbackPlaceholder')"
        ></textarea></label
      ><button class="guest-button" type="submit" :disabled="isSubmitting || !isEligible">
        {{ isSubmitting ? $t('guest.loading') : $t('reviewsPage.submitReview') }}
      </button>
    </form>
  </main>
  <TheFooter />
</template>
<style scoped>
  .review-form-page {
    max-width: 850px;
  }
  .review-form-page h1 {
    margin-top: 24px;
  }
  .review-form-page form {
    margin-top: 24px;
  }
  .rating-choices {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 12px;
  }
  .rating-choices label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px;
    border: 1px solid var(--tn-border);
    border-radius: 10px;
    cursor: pointer;
  }
  .rating-choices label:has(input:checked) {
    background: var(--tn-soft);
    border-color: var(--tn-brand);
  }
  fieldset {
    border: 0;
    padding: 0;
    min-width: 0;
  }
  legend {
    font-size: 16px;
    font-weight: 500;
  }
</style>
