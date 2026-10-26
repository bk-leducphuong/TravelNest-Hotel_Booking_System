<script>
  import { mapGetters } from 'vuex';
  import sectionFeedback from '@/mixins/sectionFeedback';

  import { PaymentService } from '@/services/payment.service';
  import AddCardModal from './payment/AddCardModal.vue';
  import ConfirmDialog from './payment/ConfirmDialog.vue';
  import SavedCardList from './payment/SavedCardList.vue';

  export default {
    mixins: [sectionFeedback],
    name: 'PaymentSettings',
    components: {
      AddCardModal,
      ConfirmDialog,
      SavedCardList,
    },
    data() {
      return {
        loadError: false,
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
      async loadPaymentMethods() {
        this.loadError = false;
        this.isLoading = true;
        try {
          const response = await PaymentService.listPaymentMethods();
          this.methods = response.data || [];
        } catch (error) {
          this.loadError = true;
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
        this.showSuccess(this.$t('account.payment.toasts.cardSaved'));
        await this.loadPaymentMethods();
      },
      requestRemoval(method) {
        this.pendingRemoval = method;
      },
      cancelRemoval() {
        this.pendingRemoval = null;
      },
      async confirmRemoval() {
        this.clearFeedback();
        if (!this.pendingRemoval) {
          return;
        }

        const { id } = this.pendingRemoval;
        this.removingId = id;

        try {
          await PaymentService.removePaymentMethod(id);
          this.pendingRemoval = null;
          this.showSuccess(this.$t('account.payment.toasts.cardRemoved'));
          await this.loadPaymentMethods();
        } catch (error) {
          this.pendingRemoval = null;
          this.showError(this.$t('account.payment.errors.remove'));
        } finally {
          this.removingId = '';
        }
      },
      async setDefault(paymentMethodId) {
        this.clearFeedback();
        this.settingDefaultId = paymentMethodId;

        try {
          await PaymentService.setDefaultPaymentMethod(paymentMethodId);
          this.showSuccess(this.$t('account.payment.toasts.defaultUpdated'));
          await this.loadPaymentMethods();
        } catch (error) {
          this.showError(this.$t('account.payment.errors.setDefault'));
        } finally {
          this.settingDefaultId = '';
        }
      },
    },
  };
</script>

<template>
  <section class="settings-panel">
    <FeedbackMessage v-if="feedback" v-bind="feedback" @dismiss="clearFeedback" />
    <header class="panel-header">
      <div>
        <h1>{{ $t('account.payment.title') }}</h1>
        <p>{{ $t('account.payment.description') }}</p>
      </div>
      <button type="button" class="primary-button" :disabled="isBusy" @click="openAddModal">
        {{ $t('account.payment.addCard') }}
      </button>
    </header>

    <div v-if="isLoading" class="empty-state">{{ $t('account.payment.loading') }}</div>

    <FeedbackMessage
      v-else-if="loadError"
      :message="$t('account.payment.errors.load')"
      retryable
      @retry="loadPaymentMethods"
    />

    <article v-else-if="methods.length === 0" class="detail-card muted-card">
      <h2>{{ $t('account.payment.savedTitle') }}</h2>
      <p>{{ $t('account.payment.emptyState') }}</p>
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
      :title="$t('account.payment.confirmRemove.title')"
      :message="
        $t('account.payment.confirmRemove.message', { last4: pendingRemoval.last4 || '••••' })
      "
      :confirm-label="$t('account.payment.confirmRemove.confirmLabel')"
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
    border: 1px solid var(--tn-border);
    border-radius: 20px;
    background: #fff;
  }

  .panel-header h1 {
    margin: 0 0 8px;
    font-size: 24px;
    line-height: 1.3;
    color: var(--tn-ink);
  }

  .panel-header p {
    margin: 0;
    color: var(--tn-muted);
    line-height: 1.6;
  }

  .detail-card {
    padding: 24px 28px;
    border: 1px solid var(--tn-border);
    border-radius: 20px;
    background: #fff;
  }

  .detail-card h2 {
    margin: 0 0 8px;
    font-size: 16px;
    line-height: 1.4;
    color: var(--tn-ink);
  }

  .detail-card p {
    margin: 0;
    color: var(--tn-muted);
    line-height: 1.5;
  }

  .muted-card {
    background: var(--tn-canvas);
  }

  .empty-state {
    padding: 28px;
    border: 1px solid var(--tn-border);
    border-radius: 20px;
    background: #fff;
    color: var(--tn-muted);
  }

  .primary-button {
    flex-shrink: 0;
    padding: 11px 16px;
    border: none;
    border-radius: 20px;
    background: var(--tn-action);
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
