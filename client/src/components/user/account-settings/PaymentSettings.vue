<script>
  import { mapGetters } from 'vuex';
  import { useToast } from 'vue-toastification';

  import { PaymentService } from '@/services/payment.service';
  import AddCardModal from './payment/AddCardModal.vue';
  import ConfirmDialog from './payment/ConfirmDialog.vue';
  import SavedCardList from './payment/SavedCardList.vue';

  export default {
    name: 'PaymentSettings',
    components: {
      AddCardModal,
      ConfirmDialog,
      SavedCardList,
    },
    setup() {
      const toast = useToast();
      return { toast };
    },
    data() {
      return {
        isLoading: true,
        methods: [],
        isAddModalOpen: false,
        pendingRemoval: null,
        removingId: '',
        settingDefaultId: '',
      };
    },
    computed: {
      ...mapGetters('user', ['getUserInformation']),
      isBusy() {
        return Boolean(this.removingId || this.settingDefaultId);
      },
      billingDetails() {
        const user = this.getUserInformation || {};
        return {
          name: user.full_name || '',
          email: user.email || '',
          phone: user.phone_number || '',
        };
      },
    },
    async mounted() {
      await this.loadPaymentMethods();
    },
    methods: {
      getErrorMessage(error, fallbackMessage) {
        const apiError = error?.response?.data?.error;
        return apiError?.message || fallbackMessage;
      },
      async loadPaymentMethods() {
        this.isLoading = true;
        try {
          const response = await PaymentService.listPaymentMethods();
          this.methods = response.data || [];
        } catch (error) {
          this.toast.error(this.getErrorMessage(error, 'Failed to load payment methods'));
        } finally {
          this.isLoading = false;
        }
      },
      openAddModal() {
        this.isAddModalOpen = true;
      },
      closeAddModal() {
        this.isAddModalOpen = false;
      },
      async handleCardSaved() {
        this.isAddModalOpen = false;
        this.toast.success('Card saved');
        await this.loadPaymentMethods();
      },
      requestRemoval(method) {
        this.pendingRemoval = method;
      },
      cancelRemoval() {
        this.pendingRemoval = null;
      },
      async confirmRemoval() {
        if (!this.pendingRemoval) {
          return;
        }

        const { id } = this.pendingRemoval;
        this.removingId = id;

        try {
          await PaymentService.removePaymentMethod(id);
          this.pendingRemoval = null;
          this.toast.success('Card removed');
          await this.loadPaymentMethods();
        } catch (error) {
          this.toast.error(this.getErrorMessage(error, 'Unable to remove this card'));
        } finally {
          this.removingId = '';
        }
      },
      async setDefault(paymentMethodId) {
        this.settingDefaultId = paymentMethodId;

        try {
          await PaymentService.setDefaultPaymentMethod(paymentMethodId);
          this.toast.success('Default card updated');
          await this.loadPaymentMethods();
        } catch (error) {
          this.toast.error(this.getErrorMessage(error, 'Unable to set the default card'));
        } finally {
          this.settingDefaultId = '';
        }
      },
    },
  };
</script>

<template>
  <section class="settings-panel">
    <header class="panel-header">
      <div>
        <h1>Payment methods</h1>
        <p>Manage the cards saved to your account and choose which one is used by default.</p>
      </div>
      <button type="button" class="primary-button" :disabled="isBusy" @click="openAddModal">
        Add card
      </button>
    </header>

    <div v-if="isLoading" class="empty-state">Loading your saved cards...</div>

    <article v-else-if="methods.length === 0" class="detail-card muted-card">
      <h2>Saved payment methods</h2>
      <p>You have no saved cards yet. Add a card to check out faster next time.</p>
    </article>

    <SavedCardList
      v-else
      :methods="methods"
      :busy="isBusy"
      @set-default="setDefault"
      @remove="requestRemoval"
    />

    <AddCardModal
      v-if="isAddModalOpen"
      :billing-details="billingDetails"
      @close="closeAddModal"
      @saved="handleCardSaved"
    />

    <ConfirmDialog
      v-if="pendingRemoval"
      title="Remove this card?"
      :message="`This will remove the card ending in ${pendingRemoval.last4 || '••••'} from your account.`"
      confirm-label="Remove card"
      :busy="Boolean(removingId)"
      @cancel="cancelRemoval"
      @confirm="confirmRemoval"
    />
  </section>
</template>

<style scoped>
  .settings-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 28px;
    border: 1px solid #dbe3f0;
    border-radius: 8px;
    background: #fff;
  }

  .panel-header h1 {
    margin: 0 0 8px;
    font-size: 30px;
    color: #0f172a;
  }

  .panel-header p {
    margin: 0;
    color: #475569;
    line-height: 1.6;
  }

  .detail-card {
    padding: 24px 28px;
    border: 1px solid #dbe3f0;
    border-radius: 8px;
    background: #fff;
  }

  .detail-card h2 {
    margin: 0 0 8px;
    font-size: 20px;
    color: #0f172a;
  }

  .detail-card p {
    margin: 0;
    color: #475569;
    line-height: 1.5;
  }

  .muted-card {
    background: #f8fafc;
  }

  .empty-state {
    padding: 28px;
    border: 1px solid #dbe3f0;
    border-radius: 8px;
    background: #fff;
    color: #64748b;
  }

  .primary-button {
    flex-shrink: 0;
    padding: 11px 16px;
    border: none;
    border-radius: 8px;
    background: #2563eb;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .primary-button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  @media (max-width: 768px) {
    .panel-header {
      flex-direction: column;
      padding: 20px;
    }

    .detail-card {
      padding: 20px;
    }
  }
</style>
