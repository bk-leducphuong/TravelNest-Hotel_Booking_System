<script setup lang="ts">
import {
  fetchPayout,
  processPayout,
  setPayoutStatus,
  type PayoutDetail,
} from "~/services/api/payouts";
import { formatDateTime, formatMoney } from "~/utils/format";
import {
  canProcessPayout,
  payoutStatusTagType,
  payoutTransitions,
} from "~/utils/payouts";

const route = useRoute();
const auth = useAuthStore();
const { can } = usePermissions();
const router = useRouter();
const { t } = useI18n();

const payoutId = computed(() => String(route.params.payoutId));
const loading = ref(false);
const detailError = ref("");
const detailRequests = useRequestVersion();
const submitting = ref(false);
const payout = ref<PayoutDetail | null>(null);

const statusDialog = reactive({
  visible: false,
  status: "",
  failureCode: "",
  failureMessage: "",
});

const netAmount = computed(() =>
  payout.value
    ? Number(payout.value.amount || 0) -
      Number(payout.value.platform_fee_amount || 0)
    : 0
);

const availableTransitions = computed(() =>
  payout.value ? payoutTransitions(payout.value.status) : []
);

useEditorGuard(
  "payout-detail",
  computed(() => statusDialog.visible),
  submitting
);
const load = async () => {
  const current = detailRequests.begin();
  payout.value = null;
  detailError.value = "";
  loading.value = false;
  if (!auth.activeHotelId || !can("payment.read")) return;
  loading.value = true;
  try {
    const result = await fetchPayout(payoutId.value);
    if (!current()) return;
    payout.value = result;
  } catch (error) {
    if (!current()) return;
    detailError.value = (error as Error).message;
    payout.value = null;
  } finally {
    if (current()) loading.value = false;
  }
};

const onProcess = async () => {
  submitting.value = true;
  try {
    await processPayout(payoutId.value);
    ElMessage.success(t("payouts.toast.processed"));
    await load();
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    submitting.value = false;
  }
};

const openStatus = () => {
  statusDialog.visible = true;
  statusDialog.status = availableTransitions.value[0] ?? "";
  statusDialog.failureCode = "";
  statusDialog.failureMessage = "";
};

const confirmStatus = async () => {
  if (!statusDialog.status) {
    ElMessage.warning(t("payouts.toast.chooseStatus"));
    return;
  }
  submitting.value = true;
  try {
    await setPayoutStatus(payoutId.value, {
      status: statusDialog.status,
      failureCode: statusDialog.failureCode || undefined,
      failureMessage: statusDialog.failureMessage || undefined,
    });
    ElMessage.success(t("payouts.toast.statusUpdated"));
    statusDialog.visible = false;
    await load();
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    submitting.value = false;
  }
};

watch(
  [payoutId, () => auth.activeHotelId, () => can("payment.read")],
  () => {
    statusDialog.visible = false;
    load();
  },
  { immediate: true }
);
</script>

<template>
  <section v-loading="loading" class="space-y-6">
    <UiPageHeader
      :title="$t('payouts.detail.title')"
      :subtitle="auth.activeHotel?.name ?? undefined"
      ><template #description
        ><div class="flex items-center gap-3">
          <el-button link @click="router.push('/payouts')"
            >← {{ $t("nav.payouts") }}</el-button
          >

          <el-tag
            v-if="payout"
            :type="payoutStatusTagType(payout.status)"
            effect="light"
          >
            {{ $t(`payouts.status.${payout.status}`) }}
          </el-tag>
        </div></template
      ><template #actions>
        <div v-if="payout" class="flex flex-wrap items-center gap-2">
          <Can permission="payment.process">
            <el-button
              v-if="canProcessPayout(payout.status)"
              type="primary"
              :loading="submitting"
              @click="onProcess"
            >
              {{ $t("payouts.action.process") }}
            </el-button>
            <el-button
              v-if="availableTransitions.length"
              :loading="submitting"
              @click="openStatus"
            >
              {{ $t("payouts.action.setStatus") }}
            </el-button>
          </Can>
        </div>
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
      v-if="!loading && !payout && !detailError"
      :description="$t('payouts.detail.notFound')"
    />

    <div v-if="payout" class="tn-summary-banner">
      <p class="text-sm opacity-90">{{ $t("payments.col.amount") }}</p>
      <p class="mt-2 text-3xl font-medium">
        {{ formatMoney(payout.amount, payout.currency) }}
      </p>
      <p class="mt-2 text-sm opacity-90">{{ payout.id }}</p>
    </div>
    <div v-if="payout" class="tn-detail-grid">
      <UiSectionCard>
        <template #header>
          <span class="font-medium">{{ $t("payouts.section.overview") }}</span>
        </template>
        <el-descriptions :column="1">
          <el-descriptions-item :label="$t('payouts.col.amount')">
            {{ formatMoney(payout.amount, payout.currency) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('payouts.col.platformFee')">
            {{ formatMoney(payout.platform_fee_amount, payout.currency) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('payouts.col.net')">
            {{ formatMoney(netAmount, payout.currency) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('payouts.col.owner')">
            {{ payout.owner?.email || payout.owner_id }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('payouts.col.period')">
            {{ payout.period_start?.slice(0, 10) || "—" }} →
            {{ payout.period_end?.slice(0, 10) || "—" }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('payouts.col.paidAt')">
            {{ formatDateTime(payout.paid_at) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('payouts.col.transferId')">
            {{ payout.provider_transfer_id || "—" }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('payouts.col.connectedAccount')">
            {{ payout.connected_payment_account?.provider_account_id || "—" }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('payouts.col.created')">
            {{ formatDateTime(payout.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item
            v-if="payout.failure_message"
            :label="$t('payouts.col.failure')"
            :span="3"
          >
            {{ payout.failure_code }} — {{ payout.failure_message }}
          </el-descriptions-item>
        </el-descriptions>
      </UiSectionCard>

      <UiSectionCard>
        <template #header>
          <span class="font-medium">{{ $t("payouts.section.items") }}</span>
        </template>
        <el-empty
          v-if="!payout.items?.length"
          :description="$t('payouts.detail.noItems')"
          :image-size="60"
        />
        <div
          v-else
          class="tn-table-region"
          role="region"
          :aria-label="$t('common.details')"
          tabindex="0"
        >
          <el-table :data="payout.items" row-key="id">
            <el-table-column :label="$t('payouts.col.booking')" min-width="180">
              <template #default="{ row }">
                <NuxtLink
                  :to="`/bookings/${row.booking_id}`"
                  class="text-action"
                >
                  {{ row.booking_id }}
                </NuxtLink>
              </template>
            </el-table-column>
            <el-table-column :label="$t('payouts.col.gross')" align="right">
              <template #default="{ row }">{{
                formatMoney(row.gross_amount, row.currency)
              }}</template>
            </el-table-column>
            <el-table-column
              :label="$t('payouts.col.platformFee')"
              align="right"
            >
              <template #default="{ row }">{{
                formatMoney(row.platform_fee_amount, row.currency)
              }}</template>
            </el-table-column>
            <el-table-column :label="$t('payouts.col.net')" align="right">
              <template #default="{ row }">{{
                formatMoney(row.net_amount, row.currency)
              }}</template>
            </el-table-column>
          </el-table>
        </div>
      </UiSectionCard>
    </div>

    <el-dialog
      v-model="statusDialog.visible"
      :title="$t('payouts.dialog.setStatusTitle')"
      width="440px"
    >
      <el-form label-position="top">
        <el-form-item :label="$t('common.status')">
          <el-select v-model="statusDialog.status" class="w-full">
            <el-option
              v-for="status in availableTransitions"
              :key="status"
              :label="$t(`payouts.status.${status}`)"
              :value="status"
            />
          </el-select>
        </el-form-item>
        <template v-if="statusDialog.status === 'failed'">
          <el-form-item :label="$t('payouts.dialog.failureCode')">
            <el-input
              v-model="statusDialog.failureCode"
              :aria-label="$t('payouts.dialog.optional')"
              :placeholder="$t('payouts.dialog.optional')"
            />
          </el-form-item>
          <el-form-item :label="$t('payouts.dialog.failureMessage')">
            <el-input
              v-model="statusDialog.failureMessage"
              type="textarea"
              :rows="2"
              :aria-label="$t('payouts.dialog.optional')"
              :placeholder="$t('payouts.dialog.optional')"
            />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="statusDialog.visible = false">{{
          $t("common.cancel")
        }}</el-button>
        <el-button type="primary" :loading="submitting" @click="confirmStatus">
          {{ $t("common.save") }}
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>
