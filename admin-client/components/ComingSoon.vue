<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <section class="space-y-2">
    <h2 class="text-2xl font-semibold tracking-tight text-slate-900">{{ title }}</h2>
    <p class="text-sm text-slate-500">
      {{ description || "This screen is coming in a later phase." }}
    </p>
    <el-alert type="info" :closable="false" show-icon class="mt-4">
      <template #title>Not implemented yet</template>
      <template #default>
        This module is scaffolded; the data screens land in the next phases.
      </template>
    </el-alert>
  </section>
</template>
