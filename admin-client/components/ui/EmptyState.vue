<script setup lang="ts">
import { Inbox } from "lucide-vue-next";
defineProps<{ title: string; description?: string }>();
</script>
<template>
  <div class="px-4 py-12 text-center">
    <Inbox :size="36" class="mx-auto mb-4 text-action" aria-hidden="true" />
    <h2 class="font-medium">{{ title }}</h2>
    <p v-if="description" class="mx-auto mt-2 max-w-md text-sm text-muted">
      {{ description }}
    </p>
    <div v-if="$slots.default" class="mt-5"><slot /></div>
  </div>
</template>
