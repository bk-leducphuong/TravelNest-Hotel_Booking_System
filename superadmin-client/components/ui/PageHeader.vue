<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>();
</script>
<template>
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div class="min-w-0 max-w-full">
      <h1 class="tn-page-title">{{ title }}</h1>
      <p
        v-if="subtitle"
        class="mt-1 break-words text-sm text-muted [overflow-wrap:anywhere]"
      >
        {{ subtitle }}
      </p>
      <slot name="description" />
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
