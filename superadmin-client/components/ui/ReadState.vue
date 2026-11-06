<script setup lang="ts">
defineProps<{
  loading?: boolean;
  error?: string;
  empty?: boolean;
  filtered?: boolean;
}>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <div v-if="loading" class="tn-section" role="status">
    <p class="mb-4 text-sm text-muted">{{ $t("common.loadingRecords") }}</p>
    <el-skeleton :rows="3" animated aria-hidden="true" />
  </div>
  <div v-else-if="error" class="tn-section space-y-3" role="alert">
    <h2 class="font-medium">{{ $t("common.loadFailed") }}</h2>
    <p class="text-sm text-muted">{{ $t(error) }}</p>
    <el-button v-if="error !== 'errors.notFound'" @click="$emit('retry')">{{
      $t("common.retry")
    }}</el-button>
  </div>
  <div v-else-if="empty" class="tn-section space-y-2" role="status">
    <h2 class="font-medium">
      {{ $t(filtered ? "common.noMatches" : "common.empty") }}
    </h2>
    <p v-if="filtered" class="text-sm text-muted">
      {{ $t("common.noMatchesHint") }}
    </p>
  </div>
</template>
