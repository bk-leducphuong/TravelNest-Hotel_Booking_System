<template>
  <el-dialog
    :model-value="true"
    :title="$t('account.payment.addCardModal.title')"
    width="560px"
    :close-on-click-modal="!saving"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    @close="handleClose"
    @opened="initialize"
  >
    <div class="card-dialog-content">
      <div class="modal-header">
        <h2>{{ $t('account.payment.addCardModal.title') }}</h2>
        <button type="button" class="ghost-button" :disabled="saving" @click="handleClose">
          {{ $t('account.common.close') }}
        </button>
      </div>

      <form @submit.prevent="handleSave">
        <div id="add-card-element" class="card-element"></div>
        <p v-if="errorMessage" class="card-error" role="alert">{{ errorMessage }}</p>

        <div class="modal-actions">
          <button type="button" class="secondary-button" :disabled="saving" @click="handleClose">
            {{ $t('account.common.cancel') }}
          </button>
          <button type="submit" class="primary-button" :disabled="saving || !stripeReady">
            {{ saving ? $t('account.common.saving') : $t('account.payment.addCardModal.save') }}
          </button>
        </div>
      </form>
    </div>
  </el-dialog>
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
        disposed: false,
        card: null,
        stripeReady: false,
        saving: false,
        errorMessage: '',
      };
    },
    beforeUnmount() {
      this.disposed = true;
      if (this.card) {
        this.card.destroy();
      }
    },
    methods: {
      async initialize() {
        try {
          const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
          if (this.disposed) return;
          this.stripe = stripe;
          const elements = this.stripe.elements();
          this.card = elements.create('card');
          this.card.mount('#add-card-element');
          this.card.addEventListener('change', (event) => {
            this.errorMessage = event.error ? event.error.message : '';
          });
          this.stripeReady = true;
        } catch (error) {
          this.errorMessage = this.$t('account.payment.addCardModal.loadError');
        }
      },

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
            error.response?.data?.error?.message ||
            error.message ||
            this.$t('account.payment.addCardModal.saveError');
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
