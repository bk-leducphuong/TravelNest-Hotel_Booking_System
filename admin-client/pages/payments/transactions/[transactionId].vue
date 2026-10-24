<script setup lang="ts">
import {
  fetchTransaction,
  initiateRefund,
  type TransactionDetail,
} from "~/services/api/payments";
import { formatDateTime, formatMoney } from "~/utils/format";
import {
  REFUND_REASONS,
  humanize,
  isRefundableTransaction,
  refundStatusTagType,
  remainingRefundable,
  transactionStatusTagType,
} from "~/utils/payments";

const route = useRoute();
const auth = useAuthStore();
const router = useRouter();
const { can } = usePermissions();
const { t } = useI18n();

const transactionId = computed(() => String(route.params.transactionId));
const loading = ref(false);
const detailError = ref("");
const detailRequests = useRequestVersion();
const submitting = ref(false);
const transaction = ref<TransactionDetail | null>(null);

const refundDialog = reactive({
  visible: false,
  amount: undefined as number | undefined,
  reason: "customer_request",
});

const reasonOptions = computed(() =>
  REFUND_REASONS.map((reason) => ({
    value: reason,
    label: t(`payments.refundReason.${reason}`),
  }))
);

const remaining = computed(() =>
  transaction.value
    ? remainingRefundable(transaction.value.amount, transaction.value.refunds)
    : 0
);

const canRefund = computed(
  () =>
    can("payment.refund") &&
    !!transaction.value &&
    isRefundableTransaction(transaction.value.status) &&
    remaining.value > 0
);

const buyerLabel = computed(() => {
  const buyer = transaction.value?.transaction_buyer;
  if (!buyer) {
    return "—";
  }
  const name = [buyer.first_name, buyer.last_name].filter(Boolean).join(" ");
  return name || buyer.email || buyer.id;
});

useEditorGuard(
  "transaction-detail",
  computed(() => refundDialog.visible),
  submitting
);
const load = async () => {
  const current = detailRequests.begin();
  transaction.value = null;
  detailError.value = "";
  loading.value = false;
  if (!auth.activeHotelId || !can("payment.read")) return;
  loading.value = true;
  try {
    const result = await fetchTransaction(transactionId.value);
    if (!current()) return;
    transaction.value = result;
  } catch (error) {
    if (!current()) return;
    detailError.value = (error as Error).message;
    transaction.value = null;
  } finally {
    if (current()) loading.value = false;
  }
};

const openRefund = () => {
  refundDialog.visible = true;
  refundDialog.amount = undefined;
  refundDialog.reason = "customer_request";
};

const confirmRefund = async () => {
  submitting.value = true;
  try {
    const result = await initiateRefund(transactionId.value, {
      amount: refundDialog.amount,
      reason: refundDialog.reason,
    });
    ElMessage.success(
      t("payments.toast.refundIssued", {
        status: t(`payments.refundStatus.${result.status}`),
        amount: formatMoney(result.amount, result.currency),
      })
    );
    refundDialog.visible = false;
    await load();
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    submitting.value = false;
  }
};

watch(
  [transactionId, () => auth.activeHotelId, () => can("payment.read")],
  () => {
    refundDialog.visible = false;
    load();
  },
  { immediate: true }
);
</script>

<template>
  <section v-loading="loading" class="space-y-6">
    <UiPageHeader
      :title="$t('payments.transaction.title')"
      :subtitle="auth.activeHotel?.name ?? undefined"
      ><template #description
        ><div class="flex items-center gap-3">
          <el-button link @click="router.push('/payments')"
            >← {{ $t("nav.payments") }}</el-button
          >

          <el-tag
            v-if="transaction"
            :type="transactionStatusTagType(transaction.status)"
            effect="light"
          >
            {{ $t(`payments.transactionStatus.${transaction.status}`) }}
          </el-tag>
        </div></template
      ><template #actions>
        <el-button v-if="canRefund" type="danger" plain @click="openRefund">
          {{ $t("payments.action.issueRefund") }}
        </el-button>
      </template></UiPageHeader
    >

    <el-alert
      v-if="detailError"
      :title="detailError"
      type="error"
      :closable="false"
      show-icon
    />
    <el-button v-if="detailError" @click="load">{{
      $t("common.refresh")
    }}</el-button>
    <el-empty
      v-if="!loading && !transaction && !detailError"
      :description="$t('payments.transaction.notFound')"
    />

    <div v-if="transaction" class="tn-summary-banner">
      <p class="text-sm opacity-90">{{ $t("payments.col.amount") }}</p>
      <p class="mt-2 text-3xl font-medium">
        {{ formatMoney(transaction.amount, transaction.currency) }}
      </p>
      <p class="mt-2 text-sm opacity-90">{{ transaction.id }}</p>
    </div>
    <div v-if="transaction" class="tn-detail-grid">
      <UiSectionCard>
        <template #header>
          <span class="font-medium">{{ $t("payments.section.overview") }}</span>
        </template>
        <el-descriptions :column="1">
          <el-descriptions-item :label="$t('payments.col.amount')">
            {{ formatMoney(transaction.amount, transaction.currency) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('payments.col.type')">
            {{ $t(`payments.transactionType.${transaction.transaction_type}`) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('payments.col.method')">
            {{ humanize(transaction.payment_method || "—") }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('payments.col.buyer')">{{
            buyerLabel
          }}</el-descriptions-item>
          <el-descriptions-item :label="$t('payments.col.booking')">
            <NuxtLink
              v-if="transaction.booking_id"
              :to="`/bookings/${transaction.booking_id}`"
              class="text-action"
            >
              {{ transaction.booking?.booking_code || transaction.booking_id }}
            </NuxtLink>
            <span v-else>—</span>
          </el-descriptions-item>
          <el-descriptions-item :label="$t('payments.col.remainingRefundable')">
            {{ formatMoney(remaining, transaction.currency) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('payments.col.created')">
            {{ formatDateTime(transaction.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('payments.col.completed')">
            {{ formatDateTime(transaction.completed_at) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('payments.col.chargeId')">
            {{ transaction.stripe_charge_id || "—" }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="transaction.failure_message"
            :label="$t('payments.col.failure')"
            :span="3"
          >
            {{ transaction.failure_code }} — {{ transaction.failure_message }}
          </el-descriptions-item>
        </el-descriptions>
      </UiSectionCard>

      <UiSectionCard v-if="transaction.payments?.length">
        <template #header>
          <span class="font-medium">{{ $t("payments.section.payments") }}</span>
        </template>
        <div
          class="tn-table-region"
          role="region"
          :aria-label="$t('common.details')"
          tabindex="0"
        >
          <el-table :data="transaction.payments" row-key="id">
            <el-table-column :label="$t('common.status')">
              <template #default="{ row }">{{
                humanize(row.payment_status)
              }}</template>
            </el-table-column>
            <el-table-column :label="$t('payments.col.amount')" align="right">
              <template #default="{ row }">{{
                formatMoney(row.amount, row.currency)
              }}</template>
            </el-table-column>
            <el-table-column :label="$t('payments.col.card')" width="180">
              <template #default="{ row }">
                {{
                  row.card_brand
                    ? `${row.card_brand} •••• ${row.card_last4}`
                    : "—"
                }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </UiSectionCard>

      <UiSectionCard>
        <template #header>
          <span class="font-medium">{{ $t("payments.section.refunds") }}</span>
        </template>
        <el-empty
          v-if="!transaction.refunds?.length"
          :description="$t('payments.transaction.noRefunds')"
          :image-size="60"
        />
        <div
          v-else
          class="tn-table-region"
          role="region"
          :aria-label="$t('common.details')"
          tabindex="0"
        >
          <el-table :data="transaction.refunds" row-key="id">
            <el-table-column :label="$t('common.status')" width="140">
              <template #default="{ row }">
                <el-tag :type="refundStatusTagType(row.status)" effect="light">
                  {{ $t(`payments.refundStatus.${row.status}`) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="$t('payments.col.amount')" align="right">
              <template #default="{ row }">{{
                formatMoney(row.amount, row.currency)
              }}</template>
            </el-table-column>
            <el-table-column :label="$t('payments.refunds.col.reason')">
              <template #default="{ row }">
                {{ $t(`payments.refundReason.${row.reason}`) }}
              </template>
            </el-table-column>
            <el-table-column :label="$t('payments.col.processed')">
              <template #default="{ row }">{{
                formatDateTime(row.processed_at)
              }}</template>
            </el-table-column>
          </el-table>
        </div>
      </UiSectionCard>
    </div>

    <el-dialog
      v-model="refundDialog.visible"
      :title="$t('payments.dialog.issueRefundTitle')"
      width="440px"
    >
      <el-form label-position="top">
        <el-form-item :label="$t('payments.dialog.amount')">
          <el-input-number
            v-model="refundDialog.amount"
            :min="0"
            :max="remaining"
            :controls="false"
            class="w-full"
            :placeholder="formatMoney(remaining, transaction?.currency)"
          />
        </el-form-item>
        <el-form-item :label="$t('payments.dialog.reason')">
          <el-select v-model="refundDialog.reason" class="w-full">
            <el-option
              v-for="option in reasonOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="refundDialog.visible = false">{{
          $t("common.cancel")
        }}</el-button>
        <el-button type="danger" :loading="submitting" @click="confirmRefund">
          {{ $t("payments.dialog.refund") }}
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>
