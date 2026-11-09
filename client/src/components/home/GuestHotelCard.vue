<script>
  import MediaImage from '@/components/ui/MediaImage.vue';
  import SavedHotelIcon from '@/components/SavedHotelIcon.vue';
  import { guestMoney, promotionBadgeDescriptor, ratingLabelKey } from '@/utils/guestPresentation';
  export default {
    components: { MediaImage, SavedHotelIcon },
    props: {
      hotel: { type: Object, required: true },
      showFavorite: { type: Boolean, default: true },
    },
    emits: ['open'],
    methods: {
      ratingLabelKey,
      hotelId(hotel) {
        return hotel.id ?? hotel.hotel_id;
      },
      hotelName(hotel) {
        return hotel.name ?? hotel.hotel_name ?? '';
      },
      hotelImage(hotel) {
        return hotel.primaryImageUrl ?? hotel.primary_image_url ?? '';
      },
      hotelLocation(hotel) {
        if (hotel.address) return hotel.address;
        const city = typeof hotel.city === 'string' ? hotel.city : hotel.city?.name;
        const country = typeof hotel.country === 'string' ? hotel.country : hotel.country?.name;
        return [city, country].filter(Boolean).join(', ');
      },
      ratingFor(hotel) {
        const value = hotel.ratingSummary?.overallRating ?? hotel.avg_rating;
        return Number.isFinite(Number(value)) ? Number(value) : 0;
      },
      reviewCountFor(hotel) {
        return hotel.ratingSummary?.totalReviews ?? hotel.review_count ?? null;
      },
      priceFor(hotel) {
        if (hotel.has_sale && hotel.min_price_per_night != null) {
          return {
            hasSale: true,
            amount: hotel.min_price_per_night,
            original: hotel.original_min_price_per_night ?? null,
            currency: hotel.currency || 'USD',
          };
        }

        const amount = hotel.minPrice ?? hotel.min_price_per_night;
        if (amount === null || amount === undefined) return null;

        return {
          hasSale: false,
          amount,
          original: null,
          currency: hotel.currency || 'USD',
        };
      },
      formatMoney(value, hotel) {
        return guestMoney(value, hotel.currency || 'USD', this.$i18n?.locale || 'en');
      },
      saleLabel(hotel) {
        const percent = Number(hotel.discount_percent);
        if (percent > 0) return this.$t('userHome.dealBadge', { percent });

        const descriptor = promotionBadgeDescriptor(hotel.promotion);
        return this.$t(descriptor.key, descriptor.params);
      },
    },
  };
</script>
<template>
  <article class="guest-property">
    <div class="guest-property-photo">
      <MediaImage :src="hotelImage(hotel)" :alt="hotelName(hotel)" /><SavedHotelIcon
        v-if="showFavorite"
        :hotel-id="String(hotelId(hotel))"
        :initial-is-favorite="hotel.is_favorite ?? false"
        use-initial-favorite-status
      /><slot name="action" />
    </div>
    <div class="guest-property-copy">
      <h3>
        <a
          :href="`/hotels/${encodeURIComponent(hotelId(hotel))}`"
          @click.prevent="$emit('open', hotel)"
          >{{ hotelName(hotel) }}</a
        >
      </h3>
      <p v-if="hotelLocation(hotel)">{{ hotelLocation(hotel) }}</p>
      <p v-if="ratingFor(hotel) > 0" class="guest-property-rating">
        <span class="guest-score">{{ ratingFor(hotel) }}<small>/10</small></span
        ><span
          >{{ $t(ratingLabelKey(ratingFor(hotel)))
          }}<small v-if="reviewCountFor(hotel) != null">{{
            $t('userHome.reviewCount', { count: reviewCountFor(hotel) })
          }}</small></span
        >
      </p>
      <p v-if="priceFor(hotel)" class="guest-property-price">
        <span v-if="priceFor(hotel).hasSale" class="guest-property-sale-badge">{{
          saleLabel(hotel)
        }}</span>
        <small
          v-if="priceFor(hotel).hasSale && priceFor(hotel).original != null"
          class="guest-property-original"
          >{{ formatMoney(priceFor(hotel).original, hotel) }}</small
        >
        <span>{{ $t('guest.stayFrom') }}</span>
        <strong :class="{ 'guest-property-sale-price': priceFor(hotel).hasSale }">{{
          formatMoney(priceFor(hotel).amount, hotel)
        }}</strong>
        <span>{{ $t('guest.perNight') }}</span>
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
  .guest-property-price {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px;
    color: var(--tn-ink);
  }
  .guest-property-price strong {
    font-size: 16px;
    color: var(--tn-brand);
  }
  .guest-property-price .guest-property-sale-price {
    color: #1c7c54;
  }
  .guest-property-sale-badge {
    display: inline-block;
    width: fit-content;
    padding: 2px 8px;
    border-radius: 999px;
    background: #e7f6ee;
    color: #1c7c54;
    font-size: 11px;
    font-weight: 600;
  }
  .guest-property-original {
    color: var(--tn-muted);
    text-decoration: line-through;
  }
</style>
