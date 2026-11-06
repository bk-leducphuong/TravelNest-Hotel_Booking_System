<script setup lang="ts">
import { Eye } from "lucide-vue-next";
import {
  fetchTransactions,
  type TransactionListItem,
} from "~/services/api/payments";
import { formatDateTime, formatMoney } from "~/utils/format";
import {
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  transactionStatusTagType,
} from "~/utils/payments";

const auth = useAuthStore();
const { can } = usePermissions();
const router = useRouter();
const { t } = useI18n();

const overview = ref<{ reload: () => Promise<void> } | null>(null);
const refreshAll = () => Promise.all([load(), overview.value?.reload()]);
const loading = ref(false);
const listError = ref("");
const listRequests = useRequestVersion();
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

const statusOptions = computed(() =>
  TRANSACTION_STATUSES.map((status) => ({
    value: status,
    label: t(`payments.transactionStatus.${status}`),
  }))
);
const typeOptions = computed(() =>
  TRANSACTION_TYPES.map((type) => ({
    value: type,
    label: t(`payments.transactionType.${type}`),
  }))
);

const load = async () => {
  const current = listRequests.begin();
  listError.value = "";
  transactions.value = [];
  total.value = 0;
  loading.value = false;
  if (!auth.activeHotelId || !can("payment.read")) {
    return;
  }
  loading.value = true;
  try {
    const result = await fetchTransactions({ ...filters });
    if (!current()) return;
    transactions.value = result.data;
    total.value = result.meta.total;
  } catch (error) {
    if (current()) listError.value = (error as Error).message;
  } finally {
    if (current()) loading.value = false;
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
  [() => auth.activeHotelId, () => can("payment.read")],
  () => {
    filters.page = 1;
    load();
  },
  { immediate: true }
);
</script>

<template>
  <section class="space-y-6">
    <UiPageHeader
      :title="$t('nav.payments')"
      :subtitle="auth.activeHotel?.name || $t('dashboard.noHotelSelected')"
      ><template #actions
        ><div class="flex flex-wrap items-center gap-2">
          <NuxtLink to="/payments/refunds">
            <el-button>{{ $t("payments.action.refunds") }}</el-button>
          </NuxtLink>
          <el-button
            :loading="loading"
            :disabled="!auth.activeHotelId"
            @click="refreshAll"
          >
            {{ $t("common.refresh") }}
          </el-button>
        </div></template
      ></UiPageHeader
    >

    <UiEmptyState v-if="!can('payment.read')" :title="$t('editor.forbidden')" />
    <el-empty
      v-else-if="!auth.activeHotelId"
      :description="$t('payments.empty.selectHotel')"
    />

    <template v-else>
      <MetricsOverview ref="overview" kind="payments" distribution />
      <el-alert
        v-if="listError"
        :title="listError"
        type="error"
        :closable="false"
        show-icon
      />

      <UiFilterBar>
        <div class="flex flex-wrap items-end gap-3">
          <el-select
            v-model="filters.status"
            :aria-label="$t('payments.filter.allStatuses')"
            :placeholder="$t('payments.filter.allStatuses')"
            clearable
            class="w-52"
          >
            <el-option
              v-for="option in statusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <el-select
            v-model="filters.transactionType"
            :aria-label="$t('payments.filter.allTypes')"
            :placeholder="$t('payments.filter.allTypes')"
            clearable
            class="w-40"
          >
            <el-option
              v-for="option in typeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <el-date-picker
            v-model="filters.dateFrom"
            type="date"
            :aria-label="$t('payments.filter.from')"
            :placeholder="$t('payments.filter.from')"
            value-format="YYYY-MM-DD"
          />
          <el-date-picker
            v-model="filters.dateTo"
            type="date"
            :aria-label="$t('payments.filter.to')"
            :placeholder="$t('payments.filter.to')"
            value-format="YYYY-MM-DD"
          />
          <el-button type="primary" @click="applyFilters">
            {{ $t("payments.filter.apply") }}
          </el-button>
          <el-button @click="resetFilters">{{
            $t("payments.filter.reset")
          }}</el-button>
        </div>
      </UiFilterBar>

      <UiSectionCard>
        <div
          class="tn-table-region"
          role="region"
          :aria-label="$t('common.details')"
          tabindex="0"
        >
          <el-table
            v-loading="loading"
            :data="transactions"
            row-key="id"
            @row-click="openTransaction"
          >
            <el-table-column :label="$t('payments.col.date')" width="180">
              <template #default="{ row }">{{
                formatDateTime(row.created_at)
              }}</template>
            </el-table-column>
            <el-table-column :label="$t('payments.col.booking')" width="150">
              <template #default="{ row }">{{
                row.booking?.booking_code || "—"
              }}</template>
            </el-table-column>
            <el-table-column :label="$t('payments.col.type')" width="110">
              <template #default="{ row }">
                {{ $t(`payments.transactionType.${row.transaction_type}`) }}
              </template>
            </el-table-column>
            <el-table-column
              :label="$t('payments.col.amount')"
              width="140"
              align="right"
            >
              <template #default="{ row }">{{
                formatMoney(row.amount, row.currency)
              }}</template>
            </el-table-column>
            <el-table-column :label="$t('common.status')" width="170">
              <template #default="{ row }">
                <el-tag
                  :type="transactionStatusTagType(row.status)"
                  effect="light"
                >
                  {{ $t(`payments.transactionStatus.${row.status}`) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              :label="$t('common.actions')"
              width="90"
              align="right"
            >
              <template #default="{ row }">
                <NuxtLink
                  :to="`/payments/transactions/${row.id}`"
                  :aria-label="$t('common.viewRecord', { id: row.id })"
                  @click.stop
                  ><Eye :size="18" aria-hidden="true"
                /></NuxtLink>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty
                :description="$t('payments.empty.transactions')"
                :image-size="60"
              />
            </template>
          </el-table>
        </div>

        <div class="mt-4 flex justify-end">
          <el-pagination
            :current-page="filters.page"
            :page-size="filters.limit"
            :total="total"
            layout="prev, pager, next, total"
            @current-change="onPageChange"
          />
        </div>
      </UiSectionCard>
    </template>
  </section>
</template>
