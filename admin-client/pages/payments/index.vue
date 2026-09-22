<script setup lang="ts">
import { fetchTransactions, type TransactionListItem } from "~/services/api/payments";
import { formatDateTime, formatMoney } from "~/utils/format";
import { TRANSACTION_STATUSES, TRANSACTION_TYPES, humanize, transactionStatusTagType } from "~/utils/payments";

const auth = useAuthStore();
const router = useRouter();

const loading = ref(false);
const transactions = ref<TransactionListItem[]>([]);
const total = ref(0);

const filters = reactive({
  status: "",
  transactionType: "",
  dateFrom: "",
  dateTo: "",
  page: 1,
  limit: 20,
});

const statusOptions = TRANSACTION_STATUSES.map((status) => ({ value: status, label: humanize(status) }));
const typeOptions = TRANSACTION_TYPES.map((type) => ({ value: type, label: humanize(type) }));

const load = async () => {
  if (!auth.activeHotelId) {
    return;
  }
  loading.value = true;
  try {
    const result = await fetchTransactions({ ...filters });
    transactions.value = result.data;
    total.value = result.meta.total;
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loading.value = false;
  }
};

const applyFilters = () => {
  filters.page = 1;
  load();
};

const resetFilters = () => {
  filters.status = "";
  filters.transactionType = "";
  filters.dateFrom = "";
  filters.dateTo = "";
  filters.page = 1;
  load();
};

const onPageChange = (page: number) => {
  filters.page = page;
  load();
};

const openTransaction = (row: TransactionListItem) => {
  router.push(`/payments/transactions/${row.id}`);
};

watch(
  () => auth.activeHotelId,
  () => {
    filters.page = 1;
    load();
  },
  { immediate: true }
);
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Payments</h2>
        <p class="mt-1 text-sm text-slate-500">{{ auth.activeHotel?.name || "No hotel selected" }}</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/payments/refunds"><el-button>Refunds</el-button></NuxtLink>
        <el-button :loading="loading" :disabled="!auth.activeHotelId" @click="load">Refresh</el-button>
      </div>
    </div>

    <el-empty v-if="!auth.activeHotelId" description="Select a hotel to view payments." />

    <template v-else>
      <el-card class="shadow-sm">
        <div class="flex flex-wrap items-end gap-3">
          <el-select v-model="filters.status" placeholder="All statuses" clearable class="w-52">
            <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
          <el-select v-model="filters.transactionType" placeholder="All types" clearable class="w-40">
            <el-option v-for="option in typeOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
          <el-date-picker v-model="filters.dateFrom" type="date" placeholder="From" value-format="YYYY-MM-DD" />
          <el-date-picker v-model="filters.dateTo" type="date" placeholder="To" value-format="YYYY-MM-DD" />
          <el-button type="primary" @click="applyFilters">Apply</el-button>
          <el-button @click="resetFilters">Reset</el-button>
        </div>
      </el-card>

      <el-card class="shadow-sm">
        <el-table v-loading="loading" :data="transactions" row-key="id" @row-click="openTransaction">
          <el-table-column label="Date" width="180">
            <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="Booking" width="150">
            <template #default="{ row }">{{ row.booking?.booking_code || "—" }}</template>
          </el-table-column>
          <el-table-column label="Type" width="110">
            <template #default="{ row }">{{ humanize(row.transaction_type) }}</template>
          </el-table-column>
          <el-table-column label="Amount" width="140" align="right">
            <template #default="{ row }">{{ formatMoney(row.amount, row.currency) }}</template>
          </el-table-column>
          <el-table-column label="Status" width="170">
            <template #default="{ row }">
              <el-tag :type="transactionStatusTagType(row.status)" effect="light">
                {{ humanize(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="" width="90" align="right">
            <template #default="{ row }">
              <el-button link type="primary" @click.stop="openTransaction(row)">View</el-button>
            </template>
          </el-table-column>
          <template #empty><el-empty description="No transactions found" :image-size="60" /></template>
        </el-table>

        <div class="mt-4 flex justify-end">
          <el-pagination
            :current-page="filters.page"
            :page-size="filters.limit"
            :total="total"
            layout="prev, pager, next, total"
            @current-change="onPageChange"
          />
        </div>
      </el-card>
    </template>
  </section>
</template>
