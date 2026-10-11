<script setup lang="ts">
import {
  fetchFinanceOverview,
  type FinanceOverview,
} from "~/services/api/finance";

const loading = ref(false);
const error = ref<string | null>(null);
const overview = ref<FinanceOverview | null>(null);

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    overview.value = await fetchFinanceOverview();
  } catch (err) {
    overview.value = null;
    error.value =
      err instanceof Error ? err.message : "Failed to load finance overview";
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const sections = computed(() => [
  {
    key: "gross",
    label: "Gross payments (completed)",
    rows: overview.value?.gross ?? [],
  },
  {
    key: "refunds",
    label: "Refunds (succeeded)",
    rows: overview.value?.refunds ?? [],
  },
  {
    key: "payoutsPaid",
    label: "Payouts (paid)",
    rows: overview.value?.payoutsPaid ?? [],
  },
  {
    key: "payoutsPending",
    label: "Payouts (pending)",
    rows: overview.value?.payoutsPending ?? [],
  },
]);

const generatedAt = computed(() =>
  overview.value ? new Date(overview.value.generatedAt).toLocaleString() : null
);
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
          Finance
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          Platform-wide, read-only
          <span v-if="generatedAt">· {{ generatedAt }}</span>
        </p>
      </div>
      <el-button :loading="loading" @click="load">Refresh</el-button>
    </div>

    <FinanceNav />

    <el-alert
      v-if="error"
      type="error"
      :title="error"
      :closable="false"
      show-icon
    />

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <el-card
        v-for="section in sections"
        :key="section.key"
        v-loading="loading"
        class="shadow-sm"
      >
        <template #header>
          <span class="font-medium">{{ section.label }}</span>
        </template>
        <el-empty
          v-if="!section.rows.length"
          description="No data"
          :image-size="60"
        />
        <ul v-else class="space-y-2">
          <li
            v-for="row in section.rows"
            :key="row.currency"
            class="flex items-center justify-between gap-4"
          >
            <span class="text-sm text-slate-600">{{ row.currency }}</span>
            <span class="text-sm font-medium text-slate-900">
              {{ formatMoney(row.amount, row.currency) }}
              <span class="ml-1 text-xs font-normal text-slate-400">
                ({{ row.count }})
              </span>
            </span>
          </li>
        </ul>
      </el-card>
    </div>
  </section>
</template>
