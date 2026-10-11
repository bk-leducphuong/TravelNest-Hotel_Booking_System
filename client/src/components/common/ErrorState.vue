<template>
  <div class="tn-empty">
    <i v-if="icon" :class="icon" class="tn-empty-icon" aria-hidden="true"></i>
    <h3 class="tn-empty-title">{{ title }}</h3>
    <p class="tn-empty-message">{{ message }}</p>
    <button v-if="retryable" type="button" class="tn-retry" @click="$emit('retry')">
      {{ retryLabel }}
    </button>
  </div>
</template>

<script>
  export default {
    name: 'ErrorState',
    emits: ['retry'],
    props: {
      title: { type: String, default: 'Something went wrong' },
      message: { type: String, default: 'Please try again in a moment.' },
      icon: { type: String, default: 'fa-solid fa-triangle-exclamation' },
      retryable: { type: Boolean, default: true },
      retryLabel: { type: String, default: 'Try again' },
    },
  };
</script>
