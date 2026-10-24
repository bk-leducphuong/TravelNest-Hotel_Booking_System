<script setup lang="ts">
defineProps<{ title?: string; description?: string }>();
</script>
<template>
  <section class="tn-section">
    <div
      v-if="title || $slots.actions"
      class="mb-5 flex flex-wrap items-start justify-between gap-3"
    >
      <div>
        <h2 v-if="title" class="text-lg font-medium">{{ title }}</h2>
        <p v-if="description" class="mt-1 text-sm text-muted">
          {{ description }}
        </p>
      </div>
      <slot name="actions" />
    </div>
    <slot />
  </section>
</template>
