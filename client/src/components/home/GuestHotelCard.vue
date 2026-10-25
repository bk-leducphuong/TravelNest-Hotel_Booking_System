<script>
  import MediaImage from '@/components/ui/MediaImage.vue';
  import SavedHotelIcon from '@/components/SavedHotelIcon.vue';
  import { ratingLabelKey } from '@/utils/guestPresentation';
  export default {
    components: { MediaImage, SavedHotelIcon },
    props: {
      hotel: { type: Object, required: true },
      showFavorite: { type: Boolean, default: true },
    },
    emits: ['open'],
    methods: { ratingLabelKey },
  };
</script>
<template>
  <article class="guest-property">
    <div class="guest-property-photo">
      <MediaImage :src="hotel.primaryImageUrl || ''" :alt="hotel.name || ''" /><SavedHotelIcon
        v-if="showFavorite"
        :hotel-id="String(hotel.id)"
      /><slot name="action" />
    </div>
    <div class="guest-property-copy">
      <h3>
        <a
          :href="`/hotels/${encodeURIComponent(hotel.id)}`"
          @click.prevent="$emit('open', hotel)"
          >{{ hotel.name }}</a
        >
      </h3>
      <p>{{ hotel.address }}</p>
      <p v-if="hotel.ratingSummary?.overallRating > 0" class="guest-property-rating">
        <span class="guest-score">{{ hotel.ratingSummary.overallRating }}<small>/10</small></span
        ><span
          >{{ $t(ratingLabelKey(hotel.ratingSummary.overallRating))
          }}<small v-if="hotel.ratingSummary.totalReviews != null">{{
            $t('userHome.reviewCount', { count: hotel.ratingSummary.totalReviews })
          }}</small></span
        >
      </p>
    </div>
  </article>
</template>
<style scoped>
  .guest-property {
    background: white;
    border-radius: 20px;
    overflow: hidden;
    min-width: 0;
  }
  .guest-property-photo {
    position: relative;
  }
  .guest-property-photo .guest-media {
    height: 200px;
    border-radius: 0;
  }
  .guest-property-copy {
    padding: 20px;
  }
  .guest-property h3 {
    font-size: 17px;
    font-weight: 500;
    margin: 0;
  }
  .guest-property-copy > p {
    font-size: 13px;
    color: var(--tn-muted);
    margin: 10px 0 0;
    overflow-wrap: anywhere;
  }
  .guest-property-rating {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .guest-property-rating small {
    display: block;
    font-size: 11px;
  }
  .guest-score small {
    display: inline;
    font-size: 10px;
  }
</style>
