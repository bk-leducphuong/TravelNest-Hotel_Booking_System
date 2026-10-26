<script>
  import FeedbackMessage from '@/components/common/FeedbackMessage.vue';
  import { BookingService } from '@/services/booking.service';
  import { normalizeBooking, guestMoney } from '@/utils/guestPresentation';
  import { stayNights, formatStayDate } from '@/utils/stay';
  import { getFirstImageUrl } from '@/utils/images';
  import MediaImage from '@/components/ui/MediaImage.vue';
  export default {
    name: 'BookingRecord',
    components: { MediaImage, FeedbackMessage },
    props: { code: { type: String, default: '' } },
    data() {
      return { booking: null, loading: false, failure: '', version: 0 };
    },
    computed: {
      cancellable() {
        return ['pending_payment', 'confirmed', 'payment_failed', 'checked_in'].includes(
          this.booking?.status
        );
      },
      statusText() {
        const key = `bookingStatus.${this.booking?.status}`;
        const label = this.$t(key);
        return label === key ? this.$t('guest.bookingStatus') : label;
      },
      nights() {
        return stayNights(this.booking?.checkInDate, this.booking?.checkOutDate);
      },
    },
    watch: {
      code: {
        immediate: true,
        handler() {
          this.load();
        },
      },
    },
    beforeUnmount() {
      this.version++;
    },
    methods: {
      guestMoney,
      formatStayDate,
      getFirstImageUrl,
      printBooking() {
        window.print();
      },
      async load() {
        const version = ++this.version;
        this.booking = null;
        this.failure = '';
        this.loading = true;
        if (!this.code) {
          this.failure = 'guest.bookingNotFound';
          this.loading = false;
          return;
        }
        try {
          const response = await BookingService.getBookingByCode(this.code);
          if (version !== this.version) return;
          this.booking = normalizeBooking(response?.data);
          if (!this.booking?.booking_code) this.failure = 'guest.bookingNotFound';
        } catch (error) {
          if (version !== this.version) return;
          const status = error.response?.status;
          this.failure =
            status === 404
              ? 'guest.bookingNotFound'
              : status === 403
                ? 'guest.bookingForbidden'
                : 'guest.loadFailed';
        } finally {
          if (version === this.version) this.loading = false;
        }
      },
    },
  };
</script>
<template>
  <main id="guest-main" tabindex="-1" class="guest-page booking-record">
    <RouterLink to="/bookings" class="record-back">← {{ $t('account.menu.bookings') }}</RouterLink>
    <p v-if="loading" role="status" class="guest-section">{{ $t('guest.loading') }}</p>
    <FeedbackMessage
      v-else-if="failure"
      :title="$t(failure)"
      :message="$t('guest.bookingRecovery')"
      retryable
      @retry="load"
    />
    <template v-else-if="booking">
      <section class="record-banner">
        <div>
          <p class="record-eyebrow">
            {{ $t('guest.bookingReference') }} · {{ booking.booking_code }}
          </p>
          <h1 class="guest-page-title">{{ statusText }}</h1>
          <p>{{ booking.hotel.name }}</p>
        </div>
        <button
          type="button"
          class="guest-button guest-button-secondary no-print"
          @click="printBooking"
        >
          {{ $t('bookingFlow.printConfirmation') }}
        </button>
      </section>
      <div class="record-grid">
        <section class="guest-section">
          <h2>{{ $t('bookingFlow.yourBookingDetails') }}</h2>
          <div class="record-property">
            <MediaImage
              :src="getFirstImageUrl(booking.hotel.image_urls || booking.hotel.images)"
              :alt="booking.hotel.name || ''"
            />
            <div>
              <h3>{{ booking.hotel.name }}</h3>
              <p>{{ booking.hotel.address }}</p>
            </div>
          </div>
          <dl class="record-facts">
            <div>
              <dt>{{ $t('bookingFlow.checkIn') }}</dt>
              <dd>{{ formatStayDate(booking.checkInDate, $i18n.locale) }}</dd>
            </div>
            <div>
              <dt>{{ $t('bookingFlow.checkOut') }}</dt>
              <dd>{{ formatStayDate(booking.checkOutDate, $i18n.locale) }}</dd>
            </div>
            <div>
              <dt>{{ $t('bookingFlow.lengthOfStay') }}</dt>
              <dd>{{ $t('bookingFlow.nightPlural', { count: nights }) }}</dd>
            </div>
            <div>
              <dt>{{ $t('hotelDetails.table.guests') }}</dt>
              <dd>{{ booking.numberOfGuests ?? '—' }}</dd>
            </div>
          </dl>
          <ul class="record-rooms">
            <li v-for="(room, index) in booking.rooms" :key="room.roomId || index">
              {{ room.roomName || $t('guest.room') }} × {{ room.quantity }}
            </li>
          </ul>
        </section>
        <aside class="guest-section">
          <h2>{{ $t('bookingFlow.priceSummary') }}</h2>
          <p class="record-total">
            {{ guestMoney(booking.totalPrice, booking.currency, $i18n.locale) }}
          </p>
          <p class="guest-subtitle">{{ $t('guest.bookingAmount') }}</p>
          <RouterLink
            v-if="cancellable"
            class="guest-button guest-button-secondary no-print"
            :to="`/bookings/${encodeURIComponent(booking.booking_code)}/cancel`"
            >{{ $t('bookingFlow.cancelYourBooking') }}</RouterLink
          >
          <p v-if="cancellable" class="guest-subtitle">{{ $t('guest.cancellationReview') }}</p>
          <RouterLink class="record-browse no-print" to="/">{{
            $t('bookingFlow.bookAnotherRoom')
          }}</RouterLink>
        </aside>
      </div>
    </template>
  </main>
</template>
<style scoped>
  .record-back {
    display: inline-block;
    margin-bottom: 24px;
    font-size: 13px;
  }
  .record-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    border-radius: 20px;
    padding: 28px;
    background: var(--tn-soft);
    margin-bottom: 24px;
    color: var(--tn-brand);
  }
  .record-banner p {
    margin: 8px 0 0;
  }
  .record-eyebrow {
    font-size: 12px;
  }
  .record-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
    align-items: start;
    gap: 24px;
  }
  .record-property {
    display: flex;
    align-items: center;
    gap: 20px;
    margin: 20px 0;
  }
  .record-property .guest-media {
    width: 110px;
    height: 100px;
    flex-shrink: 0;
  }
  .record-property h3 {
    font-size: 18px;
    font-weight: 500;
  }
  .record-property p {
    font-size: 13px;
    color: var(--tn-muted);
  }
  .record-facts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .record-facts dt {
    font-size: 12px;
    color: var(--tn-muted);
    font-weight: 400;
  }
  .record-facts dd {
    margin: 4px 0 0;
    font-size: 14px;
  }
  .record-rooms {
    padding: 20px 0 0;
    list-style: none;
    border-top: 1px solid #eee;
    font-size: 14px;
  }
  .record-total {
    font-size: 32px;
    font-weight: 500;
    color: var(--tn-brand);
    margin: 20px 0 0;
  }
  aside .guest-button {
    margin-top: 24px;
  }
  .record-browse {
    display: block;
    margin-top: 24px;
    font-size: 13px;
  }
  @media (max-width: 767px) {
    .record-grid {
      grid-template-columns: minmax(0, 1fr);
    }
    .record-banner {
      flex-direction: column;
      align-items: flex-start;
      padding: 24px;
    }
    .record-property {
      flex-wrap: wrap;
    }
  }
  @media print {
    .no-print,
    .record-back {
      display: none;
    }
    .record-grid {
      display: block;
    }
    .record-banner,
    .guest-section {
      break-inside: avoid;
    }
  }
</style>
