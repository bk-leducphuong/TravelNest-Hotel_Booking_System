<script>
  import FeedbackMessage from './FeedbackMessage.vue';
  export default {
    name: 'ErrorState',
    components: { FeedbackMessage },
    emits: ['retry'],
    props: {
      title: { type: String, default: '' },
      message: { type: String, default: '' },
      icon: { type: String, default: '' },
      retryable: { type: Boolean, default: true },
      retryLabel: { type: String, default: '' },
    },
  };
</script>

<template>
  <FeedbackMessage
    :title="title"
    :message="message"
    :retryable="retryable"
    :retry-label="retryLabel"
    @retry="$emit('retry')"
  />
</template>
