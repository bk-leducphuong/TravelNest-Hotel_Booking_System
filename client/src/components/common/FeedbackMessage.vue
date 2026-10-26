<script>
  export default {
    name: 'FeedbackMessage',
    emits: ['retry', 'dismiss'],
    props: {
      type: { type: String, default: 'error' },
      focus: { type: Boolean, default: false },
      title: { type: String, default: '' },
      message: { type: String, default: '' },
      retryLabel: { type: String, default: '' },
      retryable: { type: Boolean, default: false },
      dismissible: { type: Boolean, default: false },
    },
    mounted() {
      if (this.focus) {
        this.$nextTick(() => {
          this.$refs.message?.focus({ preventScroll: true });
          this.$refs.message?.scrollIntoView?.({ block: 'nearest' });
        });
      }
    },
  };
</script>

<template>
  <div
    ref="message"
    :tabindex="focus ? -1 : undefined"
    class="section-feedback"
    :class="`section-feedback--${type}`"
    :role="type === 'error' ? 'alert' : 'status'"
    aria-atomic="true"
  >
    <svg
      class="section-feedback-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path v-if="type === 'success'" d="m8 12 3 3 5-6" />
      <path v-else d="M12 7v6m0 3v1" />
    </svg>
    <div class="section-feedback-content">
      <h3>{{ title || $t(`feedback.${type}Title`) }}</h3>
      <p>{{ message || $t('feedback.loadMessage') }}</p>
      <button
        v-if="retryable"
        type="button"
        class="guest-button guest-button-secondary"
        @click="$emit('retry')"
      >
        {{ retryLabel || $t('guest.retry') }}
      </button>
    </div>
    <button
      v-if="dismissible"
      type="button"
      class="section-feedback-dismiss"
      :aria-label="$t('feedback.dismiss')"
      @click="$emit('dismiss')"
    >
      ×
    </button>
  </div>
</template>

<style scoped>
  .section-feedback {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 22px;
    margin: 16px 0;
    border: 1px solid #ead5ce;
    border-radius: 16px;
    background: #fff8f5;
    color: #853e2b;
    text-align: left;
    overflow-wrap: anywhere;
  }
  .section-feedback--success {
    background: #f1faf5;
    border-color: #bddfc9;
    color: #23603d;
  }
  .section-feedback--info {
    background: #f3f7fc;
    border-color: #cedaeb;
    color: #294c7c;
  }
  .section-feedback-icon {
    width: 28px;
    height: 28px;
    flex: 0 0 28px;
  }
  .section-feedback-content {
    flex: 1;
    min-width: 0;
  }
  .section-feedback h3 {
    margin: 0 0 6px;
    font-size: 17px;
    font-weight: 600;
  }
  .section-feedback p {
    margin: 0;
    font-size: 14px;
    line-height: 1.7;
  }
  .section-feedback .guest-button {
    margin-top: 16px;
  }
  .section-feedback-dismiss {
    flex: 0 0 44px;
    min-height: 44px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    font-size: 24px;
    cursor: pointer;
  }
  @media (max-width: 480px) {
    .section-feedback {
      padding: 16px;
      gap: 10px;
    }
  }
</style>
