<script setup lang="ts">
import type { RecordField } from "./RecordDrawer.vue";
defineProps<{ fields: RecordField[] }>();
</script>
<template>
  <dl class="grid gap-5 sm:grid-cols-2">
    <div v-for="(field, index) in fields" :key="index" class="min-w-0">
      <dt class="mb-1 text-xs text-muted">{{ field.label }}</dt>
      <dd class="break-words text-sm [overflow-wrap:anywhere]">
        <NuxtLink
          v-if="field.to"
          :to="field.to"
          class="underline underline-offset-4"
          >{{ field.value ?? "—" }}</NuxtLink
        ><span v-else>{{
          field.value || field.value === 0 ? field.value : "—"
        }}</span>
      </dd>
    </div>
  </dl>
</template>
