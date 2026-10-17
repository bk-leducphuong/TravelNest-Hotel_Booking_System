<template>
  <LoadingPopup
    :isLoading="isLoading"
    :startTitle="startTitle"
    :endTitle="endTitle"
    :isLoaded="isLoaded"
    :redirectUrl="redirectUrl"
    :fail="fail"
    :reloadOnFail="false"
  />
  <div class="payment-form">
    <div v-if="savedMethods.length" class="saved-methods">
      <h3>{{ $t('bookingFlow.paymentMethod') }}</h3>

      <label class="method-option">
        <input v-model="selectedMethodId" type="radio" value="new" />
        <span class="method-option-label">{{ $t('bookingFlow.useNewCard') }}</span>
      </label>

      <label v-for="method in savedMethods" :key="method.id" class="method-option">
        <input v-model="selectedMethodId" type="radio" :value="method.id" />
        <span class="method-option-label">
          {{ cardBrandLabel(method.brand) }} •••• {{ method.last4 }}
          <em v-if="method.isDefault"> {{ $t('bookingFlow.defaultCard') }}</em>
        </span>
        <span class="method-option-expiry">
          {{ formatCardExpiry(method.expMonth, method.expYear) }}
        </span>
      </label>
    </div>

    <form @submit.prevent="handleSubmit">
      <div v-show="selectedMethodId === 'new'" id="card-element"></div>
      <div id="card-errors" role="alert"></div>

      <!-- Payment Status Message -->
      <div v-if="paymentStatus" :class="['status-message', paymentStatus.type]">
        {{ paymentStatus.message }}
      </div>

      <button type="submit" :disabled="processing">
        {{ processing ? $t('bookingFlow.processing') : $t('bookingFlow.pay') }}
      </button>
    </form>
  </div>
</template>

<script>
  import { loadStripe } from '@stripe/stripe-js';
  import { v4 as uuidv4 } from 'uuid';
  import { mapGetters } from 'vuex';
  import LoadingPopup from '../LoadingPopup.vue';
  import { BookingService } from '@/services/booking.service';
  import { PaymentService } from '@/services/payment.service';
  import { cardBrandLabel, formatCardExpiry } from '../user/account-settings/payment/cardFormat';

  export default {
    components: {
      LoadingPopup,
    },
    emits: ['booking-created'],
    props: {
      bookingInfor: {
        type: Object,
        required: true,
      },
      searchData: {
        type: Object,
        required: true,
      },
      userInfor: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        stripe: null,
        card: null,
        processing: false,
        paymentStatus: null,
        isLoading: false,
        isLoaded: false,
        redirectUrl: '',
        fail: false,
        idempotencyKey: uuidv4(),
        createdBooking: null,
        savedMethods: [],
        selectedMethodId: 'new',
      };
    },
    computed: {
      ...mapGetters('book', ['getBookingInfor']),
      startTitle() {
        return this.$t('bookingFlow.paymentProcessing');
      },
      endTitle() {
        return this.$t('bookingFlow.paymentSuccess');
      },
    },
    async mounted() {
      // Initialize Stripe with your publishable key
      this.stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
      const elements = this.stripe.elements();

      // Create card element (used only when paying with a new card)
      this.card = elements.create('card');
      this.card.mount('#card-element');

      // Handle real-time validation errors
      this.card.addEventListener('change', (event) => {
        const displayError = document.getElementById('card-errors');
        if (event.error) {
          displayError.textContent = event.error.message;
        } else {
          displayError.textContent = '';
        }
      });

      await this.loadSavedMethods();
    },
    methods: {
      cardBrandLabel,
      formatCardExpiry,
      async loadSavedMethods() {
        try {
          const response = await PaymentService.listPaymentMethods();
          this.savedMethods = response.data || [];

          const defaultMethod = this.savedMethods.find((method) => method.isDefault);
          if (defaultMethod) {
            this.selectedMethodId = defaultMethod.id;
          }
        } catch (error) {
          // Saved cards are optional; fall back to the inline card form.
          this.savedMethods = [];
          this.selectedMethodId = 'new';
        }
      },
      async handleSubmit() {
        try {
          this.isLoading = true;
          this.processing = true;
          this.fail = false;
          this.isLoaded = false;
          this.paymentStatus = null;

          if (!this.bookingInfor.holdId) {
            throw new Error(this.$t('bookingFlow.holdMissing'));
          }

          const bookingResponse =
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

          this.createdBooking = bookingResponse;
          this.$emit('booking-created', bookingResponse.data);
          const booking = bookingResponse.data;

          const usingSavedCard = this.selectedMethodId && this.selectedMethodId !== 'new';

          const intentResponse = await BookingService.createBookingPaymentIntent(
            booking.bookingId,
            usingSavedCard ? { paymentMethodId: this.selectedMethodId } : {}
          );
          const result = intentResponse.data;

          if (result.error) {
            this.fail = true;
            throw new Error(result.error);
          }

          if (usingSavedCard) {
            // The server already confirmed the intent with the saved card; only
            // prompt for 3DS when Stripe asks for authentication.
            let confirmError = null;

            if (result.requiresAction && result.clientSecret) {
              const confirmation = await this.stripe.confirmCardPayment(result.clientSecret);
              confirmError = confirmation.error;
            }

            if (confirmError) {
              this.fail = true;
              throw new Error(confirmError.message);
            }

            this.completePayment(booking, result);
            return;
          }

          // Handle the result
          if (result.clientSecret) {
            // Confirm the payment with Stripe.js
            const { error: confirmError } = await this.stripe.confirmCardPayment(
              result.clientSecret,
              {
                payment_method: {
                  card: this.card,
                  billing_details: {
                    email: this.userInfor.email,
                    name: this.userInfor.fullName,
                    phone: this.userInfor.phoneNumber,
                  },
                },
              }
            );

            if (confirmError) {
              this.fail = true;
              throw new Error(confirmError.message);
            }

            this.completePayment(booking, result);
          }
        } catch (err) {
          this.paymentStatus = {
            type: 'error',
            message:
              err.response?.data?.message || err.response?.data?.error?.message || err.message,
          };
          this.fail = true;
          this.isLoading = false;
        } finally {
          this.processing = false;
        }
      },
      completePayment(booking, result) {
        this.isLoaded = true;
        this.isLoading = false;

        setTimeout(() => {
          this.$router.replace({
            path: '/book/complete',
            query: { bookingCode: result.bookingCode || booking.bookingCode },
          });
        }, 1000);

        // Reset form
        this.email = '';
        if (this.card) {
          this.card.clear();
        }
      },
    },
    beforeDestroy() {
      if (this.card) {
        this.card.destroy();
      }
    },
  };
</script>

<style scoped>
  .payment-form {
    max-width: 500px;
    margin: 0 auto;
    padding: 20px;
  }

  .saved-methods {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;
  }

  .saved-methods h3 {
    margin: 0;
    font-size: 16px;
    color: #0f172a;
  }

  .method-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    cursor: pointer;
  }

  .method-option-label {
    flex: 1;
    font-size: 14px;
    color: #0f172a;
  }

  .method-option-label em {
    color: #1d4ed8;
    font-style: normal;
    font-weight: 600;
  }

  .method-option-expiry {
    color: #64748b;
    font-size: 13px;
  }

  #card-element {
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-bottom: 20px;
  }

  #card-errors {
    color: #dc3545;
    margin-bottom: 10px;
  }

  .status-message {
    padding: 10px;
    margin-bottom: 15px;
    border-radius: 4px;
  }

  .status-message.success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  .status-message.error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }

  button {
    width: 100%;
    padding: 10px;
    background: #5469d4;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button:disabled {
    background: #7a8be0;
    cursor: not-allowed;
  }
</style>
