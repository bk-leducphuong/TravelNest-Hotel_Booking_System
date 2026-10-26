import FeedbackMessage from '@/components/common/FeedbackMessage.vue';

// Each component owns its feedback: one failed request cannot overwrite a sibling section.
export default {
  components: { FeedbackMessage },
  data() {
    return { feedback: null };
  },
  methods: {
    clearFeedback() {
      this.feedback = null;
    },
    showError(message = this.$t('feedback.actionMessage')) {
      this.feedback = {
        type: 'error',
        focus: true,
        title: this.$t('feedback.actionTitle'),
        message,
      };
    },
    showSuccess(message) {
      this.feedback = { type: 'success', focus: true, message, dismissible: true };
    },
    showInfo(message) {
      this.feedback = { type: 'info', focus: true, message, dismissible: true };
    },
    async confirmSuccess(message) {
      const { ElMessageBox } = await import('element-plus');
      await ElMessageBox.alert(message, this.$t('feedback.successTitle'), {
        type: 'success',
        confirmButtonText: this.$t('guest.done'),
        closeOnClickModal: false,
        closeOnPressEscape: false,
        showClose: false,
      });
    },
  },
};
