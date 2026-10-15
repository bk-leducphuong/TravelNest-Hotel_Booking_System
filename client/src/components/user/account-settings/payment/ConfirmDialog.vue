<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-card">
      <h2>{{ title }}</h2>
      <p>{{ message }}</p>
      <div class="modal-actions">
        <button type="button" class="secondary-button" :disabled="busy" @click="$emit('cancel')">
          Cancel
        </button>
        <button type="button" class="danger-button" :disabled="busy" @click="$emit('confirm')">
          {{ busy ? 'Removing...' : confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'ConfirmDialog',
    props: {
      title: {
        type: String,
        default: 'Are you sure?',
      },
      message: {
        type: String,
        default: '',
      },
      confirmLabel: {
        type: String,
        default: 'Confirm',
      },
      busy: {
        type: Boolean,
        default: false,
      },
    },
    emits: ['cancel', 'confirm'],
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
    width: min(100%, 420px);
    padding: 24px;
    border-radius: 8px;
    background: #fff;
  }

  .modal-card h2 {
    margin: 0 0 12px;
    font-size: 20px;
    color: #0f172a;
  }

  .modal-card p {
    margin: 0;
    color: #475569;
    line-height: 1.6;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
  }

  .secondary-button,
  .danger-button {
    padding: 11px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .secondary-button {
    border: 1px solid #cbd5e1;
    background: #fff;
    color: #0f172a;
  }

  .danger-button {
    border: none;
    background: #dc2626;
    color: #fff;
  }

  .danger-button:disabled,
  .secondary-button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
</style>
