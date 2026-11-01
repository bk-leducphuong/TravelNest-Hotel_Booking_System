<script setup lang="ts">
defineProps<{
  page: number;
  pages: number;
  limit: number;
  total: number;
  maxLimit?: number;
}>();
defineEmits<{ change: [page: number, limit?: number] }>();
</script>
<template>
  <div
    class="flex flex-wrap items-center justify-between gap-4 rounded-panel bg-white p-4 text-sm"
  >
    <p role="status">
      {{
        $t(total === 1 ? "common.resultsOne" : "common.results", {
          count: new Intl.NumberFormat($i18n.locale).format(total),
        })
      }}
    </p>
    <label class="flex items-center gap-2"
      ><span>{{ $t("common.pageSize") }}</span
      ><select
        :value="limit"
        class="tn-control !w-20"
        @change="
          $emit('change', 1, Number(($event.target as HTMLSelectElement).value))
        "
      >
        <option
          v-for="size in [
            ...new Set([
              20,
              50,
              100,
              ...(maxLimit === 200 ? [200] : []),
              limit,
            ]),
          ].sort((a, b) => a - b)"
          :key="size"
          :value="size"
        >
          {{ size }}
        </option>
      </select></label
    >
    <nav
      :aria-label="$t('common.page', { page, pages })"
      class="flex flex-wrap items-center gap-3"
    >
      <el-button :disabled="page <= 1" @click="$emit('change', page - 1)">{{
        $t("common.previous")
      }}</el-button>
      <span>{{ $t("common.page", { page, pages }) }}</span>
      <el-button :disabled="page >= pages" @click="$emit('change', page + 1)">{{
        $t("common.next")
      }}</el-button>
    </nav>
  </div>
</template>
