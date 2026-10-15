<template>
  <div class="modal-overlay" @click.self="handleClose">
    <div class="modal-card">
      <div class="modal-header">
        <h2>Add a card</h2>
        <button type="button" class="ghost-button" :disabled="saving" @click="handleClose">
          Close
        </button>
      </div>

      <form @submit.prevent="handleSave">
        <div id="add-card-element" class="card-element"></div>
        <p v-if="errorMessage" class="card-error" role="alert">{{ errorMessage }}</p>

        <div class="modal-actions">
          <button type="button" class="secondary-button" :disabled="saving" @click="handleClose">
            Cancel
          </button>
          <button type="submit" class="primary-button" :disabled="saving || !stripeReady">
            {{ saving ? 'Saving...' : 'Save card' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
  import { loadStripe } from '@stripe/stripe-js';

  import { PaymentService } from '@/services/payment.service';

  export default {
    name: 'AddCardModal',
    props: {
      billingDetails: {
        type: Object,
        default: () => ({}),
      },
    },
    emits: ['close', 'saved'],
    data() {
      return {
        stripe: null,
        card: null,
        stripeReady: false,
        saving: false,
        errorMessage: '',
      };
    },
    async mounted() {
      try {
        this.stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
        const elements = this.stripe.elements();
        this.card = elements.create('card');
        this.card.mount('#add-card-element');
        this.card.addEventListener('change', (event) => {
          this.errorMessage = event.error ? event.error.message : '';
        });
        this.stripeReady = true;
      } catch (error) {
        this.errorMessage = 'Unable to load the secure card form. Please try again.';
      }
    },
    beforeUnmount() {
      if (this.card) {
        this.card.destroy();
      }
    },
    methods: {
      handleClose() {
        if (this.saving) {
          return;
        }
        this.$emit('close');
      },
      async handleSave() {
        if (!this.stripe || !this.card) {
          return;
        }

        this.saving = true;
        this.errorMessage = '';

        try {
          const intentResponse = await PaymentService.createSetupIntent();
          const { clientSecret } = intentResponse.data;

          const { error, setupIntent } = await this.stripe.confirmCardSetup(clientSecret, {
            payment_method: {
              card: this.card,
              billing_details: this.billingDetails,
            },
          });

          if (error) {
            this.errorMessage = error.message;
            return;
          }

          await PaymentService.savePaymentMethod(setupIntent.id);
          this.$emit('saved');
        } catch (error) {
          this.errorMessage =
            error.response?.data?.error?.message || error.message || 'Unable to save this card.';
        } finally {
          this.saving = false;
        }
      },
    },
  };
</script>

<style scoped>
  .modal-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(15, 23, 42, 0.56);
    z-index: 1000;
  }

  .modal-card {
    width: min(100%, 460px);
    padding: 24px;
    border-radius: 8px;
    background: #fff;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 20px;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 22px;
    color: #0f172a;
  }

  .card-element {
    padding: 12px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #fff;
  }

  .card-error {
    margin: 12px 0 0;
    color: #dc2626;
    font-size: 14px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
  }

  .primary-button,
  .secondary-button,
  .ghost-button {
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .primary-button {
    padding: 11px 16px;
    border: none;
    background: #2563eb;
    color: #fff;
  }

  .primary-button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .secondary-button {
    padding: 11px 16px;
    border: 1px solid #cbd5e1;
    background: #fff;
    color: #0f172a;
  }

  .ghost-button {
    padding: 0;
    border: none;
    background: transparent;
    color: #2563eb;
  }
</style>
