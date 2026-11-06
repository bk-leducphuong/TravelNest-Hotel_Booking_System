<template>
  <ul class="saved-card-list">
    <li v-for="method in methods" :key="method.id" class="saved-card">
      <div class="saved-card-main">
        <div class="saved-card-header">
          <span class="saved-card-brand">{{ cardBrandLabel(method.brand) }}</span>
          <span v-if="method.isDefault" class="default-badge">
            {{ $t('account.payment.defaultBadge') }}
          </span>
        </div>
        <div class="saved-card-number">•••• •••• •••• {{ method.last4 || '••••' }}</div>
        <div class="saved-card-meta">
          <span>{{ method.cardholderName || $t('account.payment.cardFallback') }}</span>
          <span>
            {{ $t('account.payment.expires', { date: formatCardExpiry(method.expMonth, method.expYear) }) }}
          </span>
        </div>
      </div>

      <div class="saved-card-actions">
        <button
          v-if="!method.isDefault"
          type="button"
          class="link-button"
          :disabled="busy"
          @click="$emit('set-default', method.id)"
        >
          {{ $t('account.payment.setAsDefault') }}
        </button>
        <button
          type="button"
          class="link-button danger"
          :disabled="busy"
          @click="$emit('remove', method)"
        >
          {{ $t('account.common.remove') }}
        </button>
      </div>
    </li>
  </ul>
</template>

<script>
  import { cardBrandLabel, formatCardExpiry } from './cardFormat';

  export default {
    name: 'SavedCardList',
    props: {
      methods: {
        type: Array,
        default: () => [],
      },
      busy: {
        type: Boolean,
        default: false,
      },
    },
    emits: ['set-default', 'remove'],
    methods: {
      cardBrandLabel,
      formatCardExpiry,
    },
  };
</script>

<style scoped>
  .saved-card-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .saved-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 20px;
    border: 1px solid #dbe3f0;
    border-radius: 8px;
    background: #fff;
  }

  .saved-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
  }

  .saved-card-brand {
    color: #0f172a;
    font-size: 15px;
    font-weight: 700;
  }

  .default-badge {
    padding: 2px 8px;
    border-radius: 999px;
    background: #dbeafe;
    color: #1d4ed8;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .saved-card-number {
    color: #0f172a;
    font-size: 16px;
    letter-spacing: 1px;
  }

  .saved-card-meta {
    display: flex;
    gap: 12px;
    margin-top: 6px;
    color: #64748b;
    font-size: 13px;
  }

  .saved-card-actions {
    display: flex;
    flex-shrink: 0;
    gap: 16px;
  }

  .link-button {
    padding: 0;
    border: none;
    background: transparent;
    color: #2563eb;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .link-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .link-button.danger {
    color: #dc2626;
  }

  @media (max-width: 768px) {
    .saved-card {
      flex-direction: column;
      align-items: stretch;
    }

    .saved-card-actions {
      justify-content: flex-end;
    }
  }
</style>
