<script setup lang="ts">
defineProps<{
  modelValue: string;
  label: string;
  options: { value: string; label: string }[];
}>();
defineEmits<{ "update:modelValue": [value: string] }>();
</script>
<template>
  <div
    class="inline-flex flex-wrap gap-1 rounded-full bg-soft p-1"
    role="group"
    :aria-label="label"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="modelValue === option.value"
      class="rounded-full px-4 py-2 text-sm"
      :class="
        modelValue === option.value
          ? 'bg-action text-white'
          : 'text-brand hover:bg-white'
      "
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
