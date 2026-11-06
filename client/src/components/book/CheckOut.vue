<script>
  import FeedbackMessage from '@/components/common/FeedbackMessage.vue';
  import { loadStripe } from '@stripe/stripe-js';
  import { v4 as uuidv4 } from 'uuid';
  import { BookingService } from '@/services/booking.service';
  import { PaymentService } from '@/services/payment.service';
  import { cardBrandLabel, formatCardExpiry } from '../user/account-settings/payment/cardFormat';
  export default {
    components: { FeedbackMessage },
    props: {
      bookingInfor: { type: Object, required: true },
      searchData: { type: Object, required: true },
      userInfor: { type: Object, required: true },
    },
    emits: ['booking-created', 'busy'],
    data() {
      return {
        stripe: null,
        card: null,
        processing: false,
        initializing: false,
        initError: '',
        paymentStatus: null,
        savedMethodsError: false,
        savedMethods: [],
        selectedMethodId: 'new',
        idempotencyKey: this.bookingInfor.checkoutIdempotencyKey || uuidv4(),
        createdBooking: this.bookingInfor.checkoutBooking || null,
        disposed: false,
      };
    },
    mounted() {
      this.persistProgress();
      this.initialize();
    },
    beforeUnmount() {
      this.disposed = true;
      this.card?.destroy();
    },
    methods: {
      cardBrandLabel,
      formatCardExpiry,
      persistProgress() {
        this.$store.dispatch('book/booking', {
          ...this.bookingInfor,
          checkoutIdempotencyKey: this.idempotencyKey,
          checkoutBooking: this.createdBooking,
          checkoutGuestDetails: { ...this.userInfor },
        });
      },
      async initialize() {
        if (this.initializing) return;
        this.initializing = true;
        this.initError = '';
        this.savedMethodsError = false;
        try {
          const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
          if (this.disposed) return;
          if (!stripe) throw new Error('Stripe unavailable');
          this.stripe = stripe;
          this.card?.destroy();
          this.card = stripe.elements().create('card');
          await this.$nextTick();
          this.card.mount(this.$refs.cardElement);
          this.card.on('change', (event) => {
            this.paymentStatus = event.error
              ? { type: 'error', message: event.error.message }
              : null;
          });
          try {
            const response = await PaymentService.listPaymentMethods();
            if (this.disposed) return;
            this.savedMethods = response.data || [];
            this.selectedMethodId =
              this.savedMethods.find((method) => method.isDefault)?.id || 'new';
          } catch {
            this.savedMethodsError = true;
            this.savedMethods = [];
          }
        } catch {
          if (!this.disposed) this.initError = this.$t('guest.checkout.paymentUnavailable');
        } finally {
          if (!this.disposed) this.initializing = false;
        }
      },
      async handleSubmit() {
        if (this.processing || !this.stripe || this.initError) return;
        this.processing = true;
        this.$emit('busy', true);
        this.paymentStatus = null;
        try {
          if (!this.bookingInfor.holdId) throw new Error(this.$t('bookingFlow.holdMissing'));
          const response =
            this.createdBooking ||
            (await BookingService.createBooking(
              {
                holdId: this.bookingInfor.holdId,
                guestDetails: {
                  fullName: this.userInfor.fullName,
                  email: this.userInfor.email,
                  phoneNumber: this.userInfor.phoneNumber,
                },
              },
              this.idempotencyKey
            ));
          this.createdBooking = response;
          this.persistProgress();
          this.$emit('booking-created', response.data);
          const booking = response.data;
          const saved = this.selectedMethodId !== 'new';
          const intent = await BookingService.createBookingPaymentIntent(
            booking.bookingId,
            saved ? { paymentMethodId: this.selectedMethodId } : {}
          );
          const result = intent.data;
          if (result.error) throw new Error(result.error);
          // Even reused intents/saved cards may still need authentication. Let
          // Stripe resume the same intent instead of assuming payment succeeded.
          if (!['succeeded', 'processing', 'paid'].includes(result.status)) {
            if (!result.clientSecret) throw new Error(this.$t('guest.checkout.paymentUnavailable'));
            const confirmation = await this.stripe.confirmCardPayment(
              result.clientSecret,
              saved
                ? undefined
                : {
                    payment_method: {
                      card: this.card,
                      billing_details: {
                        name: this.userInfor.fullName,
                        email: this.userInfor.email,
                        phone: this.userInfor.phoneNumber,
                      },
                    },
                  }
            );
            if (confirmation.error) throw new Error(confirmation.error.message);
            if (!['succeeded', 'processing'].includes(confirmation.paymentIntent?.status))
              throw new Error(this.$t('guest.checkout.paymentIncomplete'));
          }
          const code = result.bookingCode || booking.bookingCode;
          if (!code) throw new Error(this.$t('guest.checkout.paymentIncomplete'));
          this.processing = false;
          this.$emit('busy', false);
          await this.$router.replace({ path: '/book/complete', query: { bookingCode: code } });
        } catch (error) {
          this.paymentStatus = {
            type: 'error',
            message:
              error.response?.data?.error?.message || error.message || this.$t('guest.loadFailed'),
          };
        } finally {
          this.processing = false;
          this.$emit('busy', false);
        }
      },
    },
  };
</script>
<template>
  <div class="payment-form" :aria-busy="processing || initializing">
    <p v-if="initializing" role="status">{{ $t('guest.loading') }}</p>
    <FeedbackMessage v-if="initError" :message="initError" retryable @retry="initialize" />
    <FeedbackMessage
      v-if="savedMethodsError"
      :message="$t('account.payment.errors.load')"
      retryable
      @retry="initialize"
    />
    <form class="guest-form" @submit.prevent="handleSubmit">
      <fieldset v-if="savedMethods.length" :disabled="processing || initializing">
        <legend>{{ $t('bookingFlow.paymentMethod') }}</legend>
        <label class="method-option"
          ><input v-model="selectedMethodId" type="radio" value="new" />{{
            $t('bookingFlow.useNewCard')
          }}</label
        ><label v-for="method in savedMethods" :key="method.id" class="method-option"
          ><input v-model="selectedMethodId" type="radio" :value="method.id" /><span
            >{{ cardBrandLabel(method.brand) }} •••• {{ method.last4
            }}<small
              >{{ formatCardExpiry(method.expMonth, method.expYear) }} ·
              {{ method.isDefault ? $t('bookingFlow.defaultCard') : '' }}</small
            ></span
          ></label
        >
      </fieldset>
      <div v-show="selectedMethodId === 'new' && !initError">
        <p id="payment-card-label">{{ $t('bookingFlow.paymentMethod') }}</p>
        <div
          ref="cardElement"
          class="payment-card"
          role="group"
          aria-labelledby="payment-card-label"
        ></div>
      </div>
      <FeedbackMessage v-if="paymentStatus" :message="paymentStatus.message" />
      <p class="guest-subtitle">{{ $t('guest.checkout.paymentNote') }}</p>
      <button
        class="guest-button"
        type="submit"
        :disabled="processing || initializing || !stripe || !!initError"
      >
        {{ processing ? $t('bookingFlow.processing') : $t('bookingFlow.pay') }}
      </button>
    </form>
  </div>
</template>
<style scoped>
  .payment-form {
    margin-top: 24px;
  }
  .method-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--tn-border);
    border-radius: 10px;
    font-size: 14px;
    margin-top: 10px;
  }
  .method-option input {
    width: 18px;
    min-height: 18px;
  }
  .method-option small {
    display: block;
    color: var(--tn-muted);
  }
  fieldset {
    border: 0;
    padding: 0;
    min-width: 0;
  }
  .payment-card {
    padding: 16px;
    border: 1px solid var(--tn-border);
    border-radius: 10px;
    background: #f8f8f8;
  }
  .payment-error {
    color: #b3261e;
    border-radius: 10px;
    background: #fbece9;
    padding: 16px;
    overflow-wrap: anywhere;
  }
</style>
