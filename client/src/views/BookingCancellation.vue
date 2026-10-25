<script>
  import Header from '@/components/Header.vue';
  import Footer from '@/components/Footer.vue';
  import { BookingService } from '@/services/booking.service';
  import { normalizeBooking, guestMoney } from '@/utils/guestPresentation';
  import { formatStayDate } from '@/utils/stay';
  export default {
    components: { Header, Footer },
    data() {
      return {
        booking: null,
        loading: false,
        error: '',
        version: 0,
        acknowledged: false,
        processRefund: true,
        processing: false,
        result: null,
      };
    },
    computed: {
      canCancel() {
        return ['pending_payment', 'confirmed', 'payment_failed', 'checked_in'].includes(
          this.booking?.status
        );
      },
      policyRooms() {
        return this.booking?.cancellation_policy_snapshot?.rooms || [];
      },
    },
    watch: {
      '$route.params.bookingCode': {
        immediate: true,
        handler() {
          this.loadBooking();
        },
      },
    },
    beforeUnmount() {
      this.version++;
    },
    methods: {
      guestMoney,
      formatStayDate,
      async loadBooking() {
        const version = ++this.version;
        this.loading = true;
        this.error = '';
        this.booking = null;
        this.result = null;
        this.acknowledged = false;
        try {
          const response = await BookingService.getBookingByCode(this.$route.params.bookingCode);
          if (version === this.version) this.booking = normalizeBooking(response?.data);
        } catch (error) {
          if (version === this.version)
            this.error = this.$t(
              error.response?.status === 404 ? 'guest.bookingNotFound' : 'guest.loadFailed'
            );
        } finally {
          if (version === this.version) this.loading = false;
        }
      },
      async cancelBooking() {
        if (!this.canCancel || !this.acknowledged || this.processing || this.result) return;
        const version = this.version;
        this.processing = true;
        this.error = '';
        try {
          const response = await BookingService.cancelBooking(this.booking.id, this.processRefund);
          if (version !== this.version) return;
          this.result = response.data;
          this.booking.status = 'cancelled';
        } catch (error) {
          if (version === this.version)
            this.error = error.response?.data?.error?.message || this.$t('guest.cancel.failed');
        } finally {
          if (version === this.version) this.processing = false;
        }
      },
    },
  };
</script>
<template>
  <Header :is-search-open="false" />
  <main id="guest-main" tabindex="-1" class="guest-page">
    <RouterLink :to="`/bookings/${encodeURIComponent($route.params.bookingCode)}`"
      >← {{ $t('bookingFlow.backToBooking') }}</RouterLink
    >
    <h1 class="guest-page-title cancel-title">{{ $t('bookingFlow.cancelYourBooking') }}</h1>
    <p v-if="loading" role="status" class="guest-section">{{ $t('guest.loading') }}</p>
    <section v-else-if="!booking" class="guest-section" role="alert">
      <p>{{ error || $t('guest.bookingNotFound') }}</p>
      <button class="guest-button" type="button" @click="loadBooking">
        {{ $t('guest.retry') }}
      </button>
    </section>
    <div v-else class="cancel-grid">
      <section class="guest-section">
        <template v-if="result"
          ><h2>{{ $t('bookingFlow.cancelledSuccess') }}</h2>
          <p role="status">
            {{
              $t(
                result.refundProcessed
                  ? 'guest.cancel.refundSubmitted'
                  : 'guest.cancel.refundNotProcessed'
              )
            }}
          </p>
          <p v-if="result.refund">
            {{ $t('guest.cancel.refundAmount') }}:
            {{ guestMoney(result.refund.amount, result.refund.currency, $i18n.locale) }}
          </p>
          <RouterLink to="/bookings" class="guest-button">{{
            $t('account.menu.bookings')
          }}</RouterLink></template
        >
        <template v-else-if="canCancel"
          ><h2>{{ $t('bookingFlow.confirmCancellation') }}</h2>
          <p>{{ $t('guest.cancel.review') }}</p>
          <p class="guest-subtitle">{{ $t('guest.cancel.noQuote') }}</p>
          <form class="guest-form" @submit.prevent="cancelBooking">
            <label class="cancel-checkbox"
              ><input v-model="processRefund" type="checkbox" :disabled="processing" />{{
                $t('guest.cancel.requestRefund')
              }}</label
            ><label class="cancel-checkbox"
              ><input v-model="acknowledged" type="checkbox" required :disabled="processing" />{{
                $t('guest.cancel.acknowledge')
              }}</label
            >
            <p v-if="error" role="alert">{{ error }}</p>
            <button
              type="submit"
              class="guest-button cancel-danger"
              :disabled="!acknowledged || processing"
            >
              {{ processing ? $t('guest.loading') : $t('bookingFlow.cancelBooking') }}</button
            ><RouterLink
              class="guest-button guest-button-secondary"
              :to="`/bookings/${encodeURIComponent(booking.booking_code)}`"
              >{{ $t('bookingFlow.keepBooking') }}</RouterLink
            >
          </form></template
        >
        <p v-else role="status">{{ $t('guest.cancel.unavailable') }}</p>
      </section>
      <aside class="guest-section">
        <h2>{{ booking.hotel.name }}</h2>
        <p class="guest-subtitle">{{ booking.booking_code }}</p>
        <p>
          {{ formatStayDate(booking.checkInDate, $i18n.locale) }} →
          {{ formatStayDate(booking.checkOutDate, $i18n.locale) }}
        </p>
        <ul>
          <li v-for="(room, index) in booking.rooms" :key="index">
            {{ room.roomName || $t('guest.room') }} × {{ room.quantity }}
          </li>
        </ul>
        <h3>{{ $t('guest.cancel.originalAmount') }}</h3>
        <p class="cancel-amount">
          {{ guestMoney(booking.totalPrice, booking.currency, $i18n.locale) }}
        </p>
        <h3>{{ $t('bookingFlow.cancellationPolicy') }}</h3>
        <p v-if="!policyRooms.length" class="guest-subtitle">{{ $t('bookingFlow.policyEmpty') }}</p>
        <ul v-else>
          <li v-for="rule in policyRooms" :key="rule.roomId">
            <strong>{{
              $t(rule.isRefundable ? 'bookingFlow.refundable' : 'bookingFlow.nonRefundable')
            }}</strong>
            <p v-if="rule.freeCancellationUntilHoursBeforeCheckin != null">
              {{
                $t('bookingFlow.freeCancellationUntil', {
                  hours: rule.freeCancellationUntilHoursBeforeCheckin,
                })
              }}
            </p>
            <p v-if="rule.refundPercentBeforeDeadline != null">
              {{ $t('guest.checkout.refundBefore', { percent: rule.refundPercentBeforeDeadline }) }}
            </p>
            <p v-if="rule.refundPercentAfterDeadline != null">
              {{ $t('guest.checkout.refundAfter', { percent: rule.refundPercentAfterDeadline }) }}
            </p>
          </li>
        </ul>
      </aside>
    </div>
  </main>
  <Footer />
</template>
<style scoped>
  .cancel-title {
    margin: 24px 0;
  }
  .cancel-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
    gap: 24px;
    align-items: start;
  }
  .cancel-checkbox {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  .cancel-checkbox input {
    width: 20px;
    min-height: 20px;
    flex-shrink: 0;
    margin-top: 3px;
  }
  .cancel-danger {
    background: #b3261e;
    border-color: #b3261e;
  }
  .cancel-amount {
    font-size: 28px;
    color: var(--tn-brand);
  }
  aside ul {
    padding-left: 20px;
    font-size: 14px;
  }
  @media (max-width: 767px) {
    .cancel-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
