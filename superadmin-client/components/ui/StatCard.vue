<script setup lang="ts">
defineProps<{ label: string; value: string | number; hint?: string }>();
</script>
<template>
  <div class="tn-section">
    <div class="flex items-center justify-between gap-3">
      <p class="text-sm text-muted">{{ label }}</p>
      <span v-if="$slots.icon" class="rounded-full bg-soft p-2 text-brand"
        ><slot name="icon"
      /></span>
    </div>
    <p class="mt-3 text-3xl font-medium tracking-tight">{{ value }}</p>
    <p v-if="hint" class="mt-2 text-xs text-muted">{{ hint }}</p>
  </div>
</template>
