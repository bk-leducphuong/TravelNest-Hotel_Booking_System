<script setup lang="ts">
import { fetchRefunds, type RefundRow } from "~/services/api/finance";

const loading = ref(false);
const error = ref<string | null>(null);
const rows = ref<RefundRow[]>([]);
const total = ref(0);
const page = ref(1);
const limit = ref(20);
const status = ref<string | undefined>(undefined);

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await fetchRefunds({
      page: page.value,
      limit: limit.value,
      status: status.value,
    });
    rows.value = result.data;
    total.value = result.meta.total;
  } catch (err) {
    rows.value = [];
    total.value = 0;
    error.value = err instanceof Error ? err.message : "Failed to load refunds";
  } finally {
    loading.value = false;
  }
};

const onFilterChange = () => {
  page.value = 1;
  load();
};

watch(page, load);
onMounted(load);
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
        Refunds
      </h2>
      <p class="mt-1 text-sm text-slate-500">
        Refund requests and their outcomes
      </p>
    </div>

    <FinanceNav />

    <div class="flex flex-wrap items-center gap-2">
      <el-select
        v-model="status"
        placeholder="All statuses"
        clearable
        class="w-44"
        @change="onFilterChange"
      >
        <el-option label="Succeeded" value="succeeded" />
        <el-option label="Pending" value="pending" />
        <el-option label="Processing" value="processing" />
        <el-option label="Failed" value="failed" />
        <el-option label="Cancelled" value="cancelled" />
      </el-select>
      <el-button :loading="loading" @click="onFilterChange">Apply</el-button>
    </div>

    <el-alert
      v-if="error"
      type="error"
      :title="error"
      :closable="false"
      show-icon
    />

    <el-table v-loading="loading" :data="rows" stripe>
      <el-table-column label="Requested" min-width="170">
        <template #default="{ row }">{{
          formatDate(row.requestedAt)
        }}</template>
      </el-table-column>
      <el-table-column label="Hotel" min-width="180">
        <template #default="{ row }">{{ row.hotel?.name || "—" }}</template>
      </el-table-column>
      <el-table-column label="Buyer" min-width="200">
        <template #default="{ row }">{{ row.buyer?.email || "—" }}</template>
      </el-table-column>
      <el-table-column label="Amount" min-width="130">
        <template #default="{ row }">
          {{ formatMoney(row.amount, row.currency) }}
        </template>
      </el-table-column>
      <el-table-column label="Reason" min-width="150">
        <template #default="{ row }">{{ row.reason }}</template>
      </el-table-column>
      <el-table-column label="Status" width="140">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" effect="plain">{{
            row.status
          }}</el-tag>
        </template>
      </el-table-column>
    </el-table>

    <div class="flex justify-end">
      <el-pagination
        v-model:current-page="page"
        :page-size="limit"
        :total="total"
        layout="prev, pager, next, total"
        background
      />
    </div>
  </section>
</template>
