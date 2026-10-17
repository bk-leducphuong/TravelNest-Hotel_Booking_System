<script setup lang="ts">
import { fetchRefunds, retryRefund, type RefundListItem } from "~/services/api/payments";
import { formatDateTime, formatMoney } from "~/utils/format";
import { REFUND_STATUSES, isRetryableRefund, refundStatusTagType } from "~/utils/payments";

const auth = useAuthStore();
const router = useRouter();
const { can } = usePermissions();
const { t } = useI18n();

const loading = ref(false);
const retryingId = ref<string | null>(null);
const refunds = ref<RefundListItem[]>([]);
const total = ref(0);

const filters = reactive({
  status: "",
  dateFrom: "",
  dateTo: "",
  page: 1,
  limit: 20,
});

const statusOptions = computed(() =>
  REFUND_STATUSES.map((status) => ({
    value: status,
    label: t(`payments.refundStatus.${status}`),
  }))
);

const buyerLabel = (row: RefundListItem) => {
  const buyer = row.buyer;
  if (!buyer) {
    return "—";
  }
  const name = [buyer.first_name, buyer.last_name].filter(Boolean).join(" ");
  return name || buyer.email || buyer.id;
};

const load = async () => {
  if (!auth.activeHotelId) {
    return;
  }
  loading.value = true;
  try {
    const result = await fetchRefunds({ ...filters });
    refunds.value = result.data;
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
  filters.dateFrom = "";
  filters.dateTo = "";
  filters.page = 1;
  load();
};

const onPageChange = (page: number) => {
  filters.page = page;
  load();
};

const openTransaction = (row: RefundListItem) => {
  router.push(`/payments/transactions/${row.transaction_id}`);
};

const retry = async (row: RefundListItem) => {
  retryingId.value = row.id;
  try {
    const result = await retryRefund(row.id);
    ElMessage.success(
      t("payments.refunds.toast.retry", {
        status: t(`payments.refundStatus.${result.status}`),
      })
    );
    await load();
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    retryingId.value = null;
  }
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
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
          {{ $t("payments.refunds.title") }}
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          {{ auth.activeHotel?.name || $t("dashboard.noHotelSelected") }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/payments">
          <el-button>{{ $t("payments.transactionsLink") }}</el-button>
        </NuxtLink>
        <el-button :loading="loading" :disabled="!auth.activeHotelId" @click="load">
          {{ $t("common.refresh") }}
        </el-button>
      </div>
    </div>

    <el-empty
      v-if="!auth.activeHotelId"
      :description="$t('payments.refunds.empty.selectHotel')"
    />

    <template v-else>
      <el-card class="shadow-sm">
        <div class="flex flex-wrap items-end gap-3">
          <el-select
            v-model="filters.status"
            :placeholder="$t('payments.filter.allStatuses')"
            clearable
            class="w-48"
          >
            <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
          <el-date-picker
            v-model="filters.dateFrom"
            type="date"
            :placeholder="$t('payments.filter.from')"
            value-format="YYYY-MM-DD"
          />
          <el-date-picker
            v-model="filters.dateTo"
            type="date"
            :placeholder="$t('payments.filter.to')"
            value-format="YYYY-MM-DD"
          />
          <el-button type="primary" @click="applyFilters">
            {{ $t("payments.filter.apply") }}
          </el-button>
          <el-button @click="resetFilters">{{ $t("payments.filter.reset") }}</el-button>
        </div>
      </el-card>

      <el-card class="shadow-sm">
        <el-table v-loading="loading" :data="refunds" row-key="id">
          <el-table-column :label="$t('payments.refunds.col.requested')" width="180">
            <template #default="{ row }">{{ formatDateTime(row.requested_at) }}</template>
          </el-table-column>
          <el-table-column :label="$t('payments.col.amount')" width="140" align="right">
            <template #default="{ row }">{{ formatMoney(row.amount, row.currency) }}</template>
          </el-table-column>
          <el-table-column :label="$t('common.status')" width="130">
            <template #default="{ row }">
              <el-tag :type="refundStatusTagType(row.status)" effect="light">
                {{ $t(`payments.refundStatus.${row.status}`) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="$t('payments.refunds.col.reason')" width="150">
            <template #default="{ row }">
              {{ $t(`payments.refundReason.${row.reason}`) }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('payments.col.booking')" width="140">
            <template #default="{ row }">{{ row.booking?.booking_code || "—" }}</template>
          </el-table-column>
          <el-table-column :label="$t('payments.refunds.col.buyer')" min-width="160">
            <template #default="{ row }">{{ buyerLabel(row) }}</template>
          </el-table-column>
          <el-table-column label="" width="190" align="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openTransaction(row)">
                {{ $t("payments.refunds.action.transaction") }}
              </el-button>
              <el-button
                v-if="can('payment.refund') && isRetryableRefund(row.status)"
                link
                type="danger"
                :loading="retryingId === row.id"
                @click="retry(row)"
              >
                {{ $t("payments.refunds.action.retry") }}
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty :description="$t('payments.refunds.empty.list')" :image-size="60" />
          </template>
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
