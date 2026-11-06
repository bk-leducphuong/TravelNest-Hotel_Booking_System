<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: "success" | "warning" | "danger" | "info" | "neutral";
  }>(),
  { tone: "neutral" }
);
</script>
<template>
  <span class="tn-status" :class="`tn-status--${tone}`"><slot /></span>
</template>
