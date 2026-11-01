<script setup lang="ts">
import type { FilterField } from "~/utils/list-query";
defineProps<{
  fields: FilterField[];
  values: Record<string, string>;
  error?: string;
}>();
defineEmits<{ apply: []; clear: []; update: [key: string, value: string] }>();
</script>
<template>
  <form class="tn-section space-y-4" @submit.prevent="$emit('apply')">
    <div class="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <label
        v-for="field in fields"
        :key="field.key"
        class="block min-w-0 text-sm"
      >
        <span class="mb-2 block font-medium">{{ $t(field.labelKey) }}</span>
        <select
          v-if="field.options"
          :value="values[field.key]"
          class="tn-control"
          @change="
            $emit(
              'update',
              field.key,
              ($event.target as HTMLSelectElement).value
            )
          "
        >
          <option value="">{{ $t("common.all") }}</option>
          <option
            v-for="option in field.options"
            :key="option.value"
            :value="option.value"
          >
            {{ $t(option.labelKey) }}
          </option>
        </select>
        <input
          v-else
          :value="values[field.key]"
          :type="field.type === 'date' ? 'date' : 'text'"
          :maxlength="field.maxLength ?? 200"
          class="tn-control"
          :spellcheck="false"
          @input="
            $emit(
              'update',
              field.key,
              ($event.target as HTMLInputElement).value
            )
          "
        />
      </label>
    </div>
    <p v-if="error" role="alert" class="text-sm text-red-800">
      {{ $t(error) }}
    </p>
    <div class="flex flex-wrap gap-2">
      <el-button native-type="submit" type="primary">{{
        $t("common.apply")
      }}</el-button>
      <el-button native-type="button" @click="$emit('clear')">{{
        $t("common.clear")
      }}</el-button>
    </div>
  </form>
</template>
