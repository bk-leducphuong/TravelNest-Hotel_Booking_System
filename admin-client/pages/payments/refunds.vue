<script setup lang="ts">
import {
  fetchRefunds,
  retryRefund,
  resolveRefundReview,
  type RefundListItem,
} from "~/services/api/payments";
import { formatDateTime, formatMoney } from "~/utils/format";
import {
  REFUND_STATUSES,
  isRetryableRefund,
  refundStatusTagType,
} from "~/utils/payments";

const auth = useAuthStore();
const router = useRouter();
const { can } = usePermissions();
const { t } = useI18n();

const loading = ref(false);
const listError = ref("");
const listRequests = useRequestVersion();
const retryingId = ref<string | null>(null);
const refunds = ref<RefundListItem[]>([]);
const total = ref(0);

const reviewRow = ref<RefundListItem | null>(null);
function openReview(row: RefundListItem) {
  reviewRow.value = row;
  reviewAmount.value = 0;
  reviewReason.value = "";
  reviewOpen.value = true;
}
const reviewOpen = ref(false);
const reviewAmount = ref(0);
const reviewReason = ref("");
const reviewing = ref(false);
async function saveReview() {
  if (
    !reviewRow.value ||
    reviewing.value ||
    !can("payment.refund") ||
    reviewReason.value.trim().length < 3
  )
    return;
  reviewing.value = true;
  try {
    await resolveRefundReview(
      reviewRow.value.id,
      reviewAmount.value,
      reviewReason.value.trim()
    );
    reviewOpen.value = false;
    await load();
  } catch {
    listError.value = t("payments.refunds.reviewFailed");
  } finally {
    reviewing.value = false;
  }
}

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
  const current = listRequests.begin();
  listError.value = "";
  refunds.value = [];
  total.value = 0;
  loading.value = false;
  if (!auth.activeHotelId || !can("payment.read")) {
    return;
  }
  loading.value = true;
  try {
    const result = await fetchRefunds({ ...filters });
    if (!current()) return;
    refunds.value = result.data;
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
  if (retryingId.value || !can("payment.refund")) return;
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

useEditorGuard(
  "refund-retry",
  computed(() => false),
  computed(() => !!retryingId.value)
);

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
      :title="$t('payments.refunds.title')"
      :subtitle="auth.activeHotel?.name || $t('dashboard.noHotelSelected')"
      ><template #actions
        ><div class="flex flex-wrap items-center gap-2">
          <NuxtLink to="/payments">
            <el-button>{{ $t("payments.transactionsLink") }}</el-button>
          </NuxtLink>
          <el-button
            :loading="loading"
            :disabled="!auth.activeHotelId"
            @click="load"
          >
            {{ $t("common.refresh") }}
          </el-button>
        </div></template
      ></UiPageHeader
    >

    <UiEmptyState v-if="!can('payment.read')" :title="$t('editor.forbidden')" />
    <el-empty
      v-else-if="!auth.activeHotelId"
      :description="$t('payments.refunds.empty.selectHotel')"
    />

    <template v-else>
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
            class="w-48"
          >
            <el-option
              v-for="option in statusOptions"
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
          <el-table v-loading="loading" :data="refunds" row-key="id">
            <el-table-column
              :label="$t('payments.refunds.col.requested')"
              width="180"
            >
              <template #default="{ row }">{{
                formatDateTime(row.requested_at)
              }}</template>
            </el-table-column>
            <el-table-column
              :label="$t('payments.col.amount')"
              width="140"
              align="right"
            >
              <template #default="{ row }">{{
                row.workflow_state === "manual_review"
                  ? $t("payments.refunds.amountUndecided")
                  : formatMoney(row.amount, row.currency)
              }}</template>
            </el-table-column>
            <el-table-column :label="$t('common.status')" width="130">
              <template #default="{ row }">
                <el-tag :type="refundStatusTagType(row.status)" effect="light">
                  {{ $t(`payments.refundStatus.${row.status}`) }}
                  <span v-if="row.workflow_state === 'manual_review'">
                    · {{ $t("payments.refunds.manualReview") }}</span
                  >
                  <span v-if="row.workflow_state === 'needs_attention'">
                    · {{ $t("payments.refunds.needsAttention") }}</span
                  >
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              :label="$t('payments.refunds.failure')"
              min-width="180"
            >
              <template #default="{ row }">{{
                row.failure_message || "—"
              }}</template>
            </el-table-column>
            <el-table-column
              :label="$t('payments.refunds.col.reason')"
              width="150"
            >
              <template #default="{ row }">
                {{ $t(`payments.refundReason.${row.reason}`) }}
              </template>
            </el-table-column>
            <el-table-column :label="$t('payments.col.booking')" width="140">
              <template #default="{ row }">{{
                row.booking?.booking_code || "—"
              }}</template>
            </el-table-column>
            <el-table-column
              :label="$t('payments.refunds.col.buyer')"
              min-width="160"
            >
              <template #default="{ row }">{{
                buyerLabel(row as RefundListItem)
              }}</template>
            </el-table-column>
            <el-table-column
              :label="$t('common.actions')"
              width="190"
              align="right"
            >
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  @click="openTransaction(row as RefundListItem)"
                >
                  {{ $t("payments.refunds.action.transaction") }}
                </el-button>
                <el-button
                  v-if="
                    can('payment.refund') &&
                    row.workflow_state === 'manual_review'
                  "
                  link
                  type="primary"
                  @click="openReview(row as RefundListItem)"
                  >{{ $t("payments.refunds.review") }}</el-button
                >
                <el-button
                  v-if="
                    can('payment.refund') &&
                    isRetryableRefund(row.status, row.workflow_state)
                  "
                  link
                  type="danger"
                  :loading="retryingId === row.id"
                  @click="retry(row as RefundListItem)"
                >
                  {{ $t("payments.refunds.action.retry") }}
                </el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty
                :description="$t('payments.refunds.empty.list')"
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
    <el-dialog
      v-model="reviewOpen"
      :title="$t('payments.refunds.review')"
      width="min(90vw, 480px)"
    >
      <label
        >{{ $t("payments.col.amount")
        }}<el-input-number v-model="reviewAmount" :min="0" :precision="2"
      /></label>
      <p>{{ $t("payments.refunds.zeroReview") }}</p>
      <label
        >{{ $t("payments.refunds.col.reason")
        }}<el-input v-model="reviewReason" type="textarea" :maxlength="500"
      /></label>
      <template #footer
        ><el-button
          type="primary"
          :loading="reviewing"
          :disabled="reviewReason.trim().length < 3"
          @click="saveReview"
          >{{ $t("payments.refunds.saveReview") }}</el-button
        ></template
      >
    </el-dialog>
  </section>
</template>
