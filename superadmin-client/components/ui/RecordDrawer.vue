<script setup lang="ts">
export interface RecordField {
  label: string;
  value: string | number | null | undefined;
  to?: string;
  copy?: boolean;
}
const props = defineProps<{
  open: boolean;
  title: string;
  fields: RecordField[];
  metadata?: Record<string, unknown> | null;
  description?: string;
}>();
defineEmits<{ close: [] }>();
const { t } = useI18n();
const feedback = ref("");
const copy = async (value: string | number | null | undefined) => {
  try {
    await navigator.clipboard.writeText(String(value));
    feedback.value = t("common.copied");
  } catch {
    feedback.value = t("common.copyFailed");
  }
};
watch([() => props.open, () => props.fields, () => t("common.copied")], () => {
  feedback.value = "";
});
</script>
<template>
  <el-drawer
    append-to-body
    :model-value="open"
    :title="title"
    size="min(100%, 600px)"
    @update:model-value="!$event && $emit('close')"
  >
    <p v-if="description" class="mb-5 text-sm text-muted">{{ description }}</p>
    <dl class="space-y-5">
      <div
        v-for="(field, index) in fields"
        :key="index"
        class="min-w-0 border-b border-gray-100 pb-3"
      >
        <dt class="mb-1 text-xs font-medium text-muted">{{ field.label }}</dt>
        <dd class="break-words text-sm [overflow-wrap:anywhere]">
          <NuxtLink
            v-if="field.to"
            :to="field.to"
            class="underline underline-offset-4"
            @click="$emit('close')"
            >{{ field.value ?? "—" }}</NuxtLink
          >
          <span v-else>{{ field.value ?? "—" }}</span>
          <button
            v-if="field.copy && field.value"
            type="button"
            class="ml-3 text-brand underline underline-offset-4"
            :aria-label="$t('common.copy', { field: field.label })"
            @click="copy(field.value)"
          >
            {{ $t("common.copy", { field: field.label }) }}
          </button>
        </dd>
      </div>
    </dl>
    <div v-if="metadata" class="mt-6">
      <h3 class="mb-3 font-medium">{{ $t("fields.metadata") }}</h3>
      <pre
        class="whitespace-pre-wrap break-words rounded-xl bg-soft p-4 text-xs [overflow-wrap:anywhere]"
        >{{ JSON.stringify(metadata, null, 2) }}</pre
      >
    </div>
    <p role="status" class="mt-4 text-sm text-muted">{{ feedback }}</p>
  </el-drawer>
</template>
