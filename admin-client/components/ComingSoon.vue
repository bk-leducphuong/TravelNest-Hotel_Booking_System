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
      {{ description || $t('comingSoon.laterPhase') }}
    </p>
    <el-alert type="info" :closable="false" show-icon class="mt-4">
      <template #title>{{ $t('comingSoon.notImplemented') }}</template>
      <template #default>
        {{ $t('comingSoon.scaffolded') }}
      </template>
    </el-alert>
  </section>
</template>
