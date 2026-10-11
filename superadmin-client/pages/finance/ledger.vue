<script setup lang="ts">
import { fetchLedger, type LedgerRow } from "~/services/api/finance";

const loading = ref(false);
const error = ref<string | null>(null);
const rows = ref<LedgerRow[]>([]);
const total = ref(0);
const page = ref(1);
const limit = ref(20);
const direction = ref<string | undefined>(undefined);
const eventType = ref("");

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await fetchLedger({
      page: page.value,
      limit: limit.value,
      direction: direction.value,
      eventType: eventType.value || undefined,
    });
    rows.value = result.data;
    total.value = result.meta.total;
  } catch (err) {
    rows.value = [];
    total.value = 0;
    error.value = err instanceof Error ? err.message : "Failed to load ledger";
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
        Ledger
      </h2>
      <p class="mt-1 text-sm text-slate-500">
        Double-entry ledger postings (read-only reconciliation view)
      </p>
    </div>

    <FinanceNav />

    <div class="flex flex-wrap items-center gap-2">
      <el-select
        v-model="direction"
        placeholder="All directions"
        clearable
        class="w-44"
        @change="onFilterChange"
      >
        <el-option label="Debit" value="debit" />
        <el-option label="Credit" value="credit" />
      </el-select>
      <el-input
        v-model="eventType"
        placeholder="Event type"
        clearable
        class="w-52"
        @keyup.enter="onFilterChange"
        @clear="onFilterChange"
      />
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
      <el-table-column label="Posted" min-width="170">
        <template #default="{ row }">{{ formatDate(row.postedAt) }}</template>
      </el-table-column>
      <el-table-column label="Account" min-width="180">
        <template #default="{ row }">{{ row.account?.name || "—" }}</template>
      </el-table-column>
      <el-table-column label="Event" min-width="180">
        <template #default="{ row }">
          <code class="text-xs text-slate-700">{{ row.eventType }}</code>
        </template>
      </el-table-column>
      <el-table-column label="Direction" width="110">
        <template #default="{ row }">
          <el-tag
            :type="row.direction === 'credit' ? 'success' : 'info'"
            effect="plain"
          >
            {{ row.direction }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Amount" min-width="130">
        <template #default="{ row }">
          {{ formatMoney(row.amount, row.currency) }}
        </template>
      </el-table-column>
      <el-table-column label="Hotel" min-width="160">
        <template #default="{ row }">{{ row.hotel?.name || "—" }}</template>
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
