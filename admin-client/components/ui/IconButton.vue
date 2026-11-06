<script setup lang="ts">
defineProps<{ label: string; disabled?: boolean }>();
</script>
<template>
  <button
    type="button"
    class="tn-icon-button inline-flex"
    :aria-label="label"
    :title="label"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
