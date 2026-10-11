<script setup lang="ts">
import { fetchOverview, type PlatformOverview } from "~/services/api/overview";

const loading = ref(false);
const error = ref<string | null>(null);
const overview = ref<PlatformOverview | null>(null);

const statusLabel = (status: string) =>
  status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    overview.value = await fetchOverview();
  } catch (err) {
    overview.value = null;
    error.value =
      err instanceof Error ? err.message : "Failed to load overview";
  } finally {
    loading.value = false;
  }
};

onMounted(load);

const cards = computed(() => [
  {
    label: "Hotels",
    value: overview.value?.hotels.total ?? 0,
    hint: `${overview.value?.hotels.byStatus.active ?? 0} active`,
  },
  {
    label: "Users",
    value: overview.value?.users.total ?? 0,
    hint: `${overview.value?.users.byStatus.active ?? 0} active`,
  },
  {
    label: "Bookings",
    value: overview.value?.bookings.total ?? 0,
    hint: "All time",
  },
]);

const hotelStatusRows = computed(() =>
  Object.entries(overview.value?.hotels.byStatus ?? {}).map(
    ([status, count]) => ({
      status,
      count,
    })
  )
);

const userStatusRows = computed(() =>
  Object.entries(overview.value?.users.byStatus ?? {}).map(
    ([status, count]) => ({
      status,
      count,
    })
  )
);

const generatedAt = computed(() =>
  overview.value ? new Date(overview.value.generatedAt).toLocaleString() : null
);
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
          Platform overview
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          Cross-tenant health across every hotel and user
          <span v-if="generatedAt">· {{ generatedAt }}</span>
        </p>
      </div>
      <el-button :loading="loading" @click="load">Refresh</el-button>
    </div>

    <el-alert
      v-if="error"
      type="error"
      :title="error"
      :closable="false"
      show-icon
    />

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <el-card
        v-for="card in cards"
        :key="card.label"
        v-loading="loading"
        class="shadow-sm"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-slate-400">
          {{ card.label }}
        </p>
        <p class="mt-1 text-3xl font-semibold text-slate-900">
          {{ card.value }}
        </p>
        <p class="mt-1 text-xs text-slate-500">{{ card.hint }}</p>
      </el-card>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <el-card v-loading="loading" class="shadow-sm">
        <template #header>
          <span class="font-medium">Hotels by status</span>
        </template>
        <ul class="space-y-3">
          <li
            v-for="row in hotelStatusRows"
            :key="row.status"
            class="flex items-center justify-between gap-4"
          >
            <span class="w-40 text-sm text-slate-600">
              {{ statusLabel(row.status) }}
            </span>
            <span class="text-sm font-medium text-slate-900">{{
              row.count
            }}</span>
          </li>
        </ul>
      </el-card>

      <el-card v-loading="loading" class="shadow-sm">
        <template #header>
          <span class="font-medium">Users by status</span>
        </template>
        <ul class="space-y-3">
          <li
            v-for="row in userStatusRows"
            :key="row.status"
            class="flex items-center justify-between gap-4"
          >
            <span class="w-40 text-sm text-slate-600">
              {{ statusLabel(row.status) }}
            </span>
            <span class="text-sm font-medium text-slate-900">{{
              row.count
            }}</span>
          </li>
        </ul>
      </el-card>
    </div>
  </section>
</template>
