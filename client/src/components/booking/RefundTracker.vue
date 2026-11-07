<script>
  import FeedbackMessage from '@/components/common/FeedbackMessage.vue';
  import { BookingService } from '@/services/booking.service';
  import {
    isRefundTransient,
    refundAmountText,
    refundMessageKey,
    refundNeedsSupport,
    refundState,
    refundTone,
  } from '@/utils/refundPresentation';
  import { guestMoney } from '@/utils/guestPresentation';

  const POLL_INTERVAL_MS = 30000;
  const MAX_POLL_WINDOW_MS = 10 * 60 * 1000;

  export default {
    name: 'RefundTracker',
    components: { FeedbackMessage },
    props: {
      bookingId: { type: [String, Number], required: true },
      bookingCode: { type: String, default: '' },
      // Use inside an existing surface (e.g. the cancellation page column).
      plain: { type: Boolean, default: false },
    },
    data() {
      return {
        status: null,
        loading: false,
        failure: '',
        lastChecked: null,
        version: 0,
        pollTimer: null,
        pollStartedAt: 0,
      };
    },
    computed: {
      decision() {
        return this.status?.decision || null;
      },
      refund() {
        return this.status?.refund || null;
      },
      state() {
        return refundState({ outcome: this.decision?.outcome, refund: this.refund });
      },
      tone() {
        return refundTone(this.state);
      },
      messageKey() {
        return refundMessageKey(this.state);
      },
      amountText() {
        return refundAmountText(this.refund, this.$i18n.locale);
      },
      cancellationFeeText() {
        const fee = this.decision?.quote?.cancellationFee;
        if (fee === null || fee === undefined) return null;
        const amount = Number(fee);
        if (!Number.isFinite(amount) || amount <= 0) return null;
        return guestMoney(
          amount,
          this.refund?.currency || this.decision?.quote?.currency,
          this.$i18n.locale
        );
      },
      showsDestination() {
        return Boolean(this.amountText);
      },
      etaText() {
        const eta = this.decision?.quote?.etaDays;
        // Arrival estimates only apply while the provider is still processing.
        if (!this.amountText || !eta || !isRefundTransient(this.state)) return null;
        return this.$t('guest.cancel.eta', { min: eta.min, max: eta.max });
      },
      supportHint() {
        return refundNeedsSupport(this.state) && Boolean(this.bookingCode);
      },
      lastCheckedText() {
        if (!this.lastChecked) return '';
        return this.lastChecked.toLocaleTimeString(this.$i18n.locale, {
          hour: '2-digit',
          minute: '2-digit',
        });
      },
    },
    watch: {
      bookingId: {
        immediate: true,
        handler() {
          this.pollStartedAt = Date.now();
          this.load();
        },
      },
    },
    beforeUnmount() {
      this.version++;
      this.stopPolling();
    },
    methods: {
      async load({ silent = false } = {}) {
        if (!this.bookingId) return;
        const version = ++this.version;
        if (!silent) this.loading = true;
        this.failure = '';

        try {
          const response = await BookingService.getRefundStatus(this.bookingId);
          if (version !== this.version) return;
          this.status = response?.data || null;
          this.lastChecked = new Date();
          this.schedulePoll();
        } catch (error) {
          if (version !== this.version) return;
          if (silent) {
            // Keep a transient refund visible and retry on the next interval.
            this.schedulePoll();
          } else {
            const status = error.response?.status;
            this.failure =
              status === 404
                ? 'guest.bookingNotFound'
                : status === 403
                  ? 'guest.bookingForbidden'
                  : 'guest.refundUnavailable';
          }
        } finally {
          if (version === this.version) this.loading = false;
        }
      },
      refresh() {
        this.stopPolling();
        this.pollStartedAt = Date.now();
        this.load();
      },
      schedulePoll() {
        this.stopPolling();
        if (!isRefundTransient(this.state)) return;
        if (Date.now() - this.pollStartedAt >= MAX_POLL_WINDOW_MS) return;
        this.pollTimer = setTimeout(() => this.load({ silent: true }), POLL_INTERVAL_MS);
      },
      stopPolling() {
        if (this.pollTimer) {
          clearTimeout(this.pollTimer);
          this.pollTimer = null;
        }
      },
    },
  };
</script>

<template>
  <section
    class="refund-tracker"
    :class="[plain ? '' : 'guest-section', `refund-tracker--${tone}`]"
  >
    <div class="refund-heading">
      <h2>{{ $t('guest.cancel.trackingTitle') }}</h2>
      <span v-if="status" class="guest-pill" :class="`refund-pill--${tone}`">{{
        $t(`guest.cancel.chip.${state}`)
      }}</span>
    </div>

    <p v-if="loading && !status" role="status" class="guest-subtitle">
      {{ $t('guest.loading') }}
    </p>
    <FeedbackMessage v-else-if="failure" :message="$t(failure)" retryable @retry="refresh" />
    <template v-else-if="status">
      <p role="status">{{ $t(messageKey) }}</p>

      <dl v-if="amountText || cancellationFeeText" class="refund-facts">
        <div v-if="amountText">
          <dt>{{ $t('guest.cancel.refundAmount') }}</dt>
          <dd>{{ amountText }}</dd>
        </div>
        <div v-if="cancellationFeeText">
          <dt>{{ $t('bookingFlow.cancellationFee') }}</dt>
          <dd>{{ cancellationFeeText }}</dd>
        </div>
      </dl>

      <p v-if="showsDestination" class="guest-subtitle">
        {{ $t('guest.cancel.destination') }}
      </p>
      <p v-if="etaText" class="guest-subtitle">{{ etaText }}</p>
      <p v-if="supportHint" class="guest-subtitle">
        {{ $t('guest.cancel.supportHint', { code: bookingCode }) }}
      </p>

      <div class="refund-actions">
        <button
          type="button"
          class="guest-button guest-button-secondary"
          :disabled="loading"
          @click="refresh"
        >
          {{ $t('guest.cancel.refreshStatus') }}
        </button>
        <span v-if="lastCheckedText" class="guest-subtitle">
          {{ $t('guest.cancel.lastChecked', { time: lastCheckedText }) }}
        </span>
      </div>
    </template>
  </section>
</template>

<style scoped>
  .refund-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .refund-heading h2 {
    margin: 0;
  }
  .refund-pill--progress {
    background: #e8f2fd;
    color: #0051a8;
  }
  .refund-pill--success {
    background: #e6f5ec;
    color: #17663a;
  }
  .refund-pill--warning {
    background: #fff4dd;
    color: #7a4b00;
  }
  .refund-pill--neutral {
    background: #f0f0f0;
    color: #4d4d4d;
  }
  .refund-facts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 16px;
    margin: 20px 0;
  }
  .refund-facts dt {
    font-size: 12px;
    color: var(--tn-muted);
  }
  .refund-facts dd {
    margin: 4px 0 0;
    font-size: 18px;
    font-weight: 500;
    color: var(--tn-brand);
  }
  .refund-actions {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 20px;
  }
  .refund-actions .guest-subtitle {
    margin: 0;
  }
  @media print {
    .refund-actions {
      display: none;
    }
  }
</style>
