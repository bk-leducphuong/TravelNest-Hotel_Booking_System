<template>
  <div class="tn-empty">
    <i v-if="icon" :class="icon" class="tn-empty-icon" aria-hidden="true"></i>
    <h3 class="tn-empty-title">{{ title }}</h3>
    <p v-if="message" class="tn-empty-message">{{ message }}</p>
    <slot />
  </div>
</template>

<script>
  export default {
    name: 'EmptyState',
    props: {
      title: { type: String, default: 'Nothing here yet' },
      message: { type: String, default: '' },
      icon: { type: String, default: '' },
    },
  };
</script>
