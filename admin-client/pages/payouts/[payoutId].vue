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
  humanize,
  payoutStatusTagType,
  payoutTransitions,
} from "~/utils/payouts";

const route = useRoute();
const router = useRouter();
const { can } = usePermissions();

const payoutId = computed(() => String(route.params.payoutId));
const loading = ref(false);
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
    ? Number(payout.value.amount || 0) - Number(payout.value.platform_fee_amount || 0)
    : 0
);

const availableTransitions = computed(() =>
  payout.value ? payoutTransitions(payout.value.status) : []
);

const load = async () => {
  loading.value = true;
  try {
    payout.value = await fetchPayout(payoutId.value);
  } catch (error) {
    ElMessage.error((error as Error).message);
    payout.value = null;
  } finally {
    loading.value = false;
  }
};

const onProcess = async () => {
  submitting.value = true;
  try {
    await processPayout(payoutId.value);
    ElMessage.success("Payout processed");
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
    ElMessage.warning("Choose a status");
    return;
  }
  submitting.value = true;
  try {
    await setPayoutStatus(payoutId.value, {
      status: statusDialog.status,
      failureCode: statusDialog.failureCode || undefined,
      failureMessage: statusDialog.failureMessage || undefined,
    });
    ElMessage.success("Payout status updated");
    statusDialog.visible = false;
    await load();
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    submitting.value = false;
  }
};

watch(payoutId, load, { immediate: true });
</script>

<template>
  <section v-loading="loading" class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <el-button link @click="router.push('/payouts')">← Payouts</el-button>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Payout</h2>
        <el-tag v-if="payout" :type="payoutStatusTagType(payout.status)" effect="light">
          {{ humanize(payout.status) }}
        </el-tag>
      </div>
      <div v-if="payout" class="flex flex-wrap items-center gap-2">
        <Can permission="payment.process">
          <el-button
            v-if="canProcessPayout(payout.status)"
            type="primary"
            :loading="submitting"
            @click="onProcess"
          >
            Process payout
          </el-button>
          <el-button
            v-if="availableTransitions.length"
            :loading="submitting"
            @click="openStatus"
          >
            Set status
          </el-button>
        </Can>
      </div>
    </div>

    <el-empty v-if="!loading && !payout" description="Payout not found" />

    <template v-if="payout">
      <el-card class="shadow-sm">
        <template #header><span class="font-medium">Overview</span></template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="Amount">
            {{ formatMoney(payout.amount, payout.currency) }}
          </el-descriptions-item>
          <el-descriptions-item label="Platform fee">
            {{ formatMoney(payout.platform_fee_amount, payout.currency) }}
          </el-descriptions-item>
          <el-descriptions-item label="Net">
            {{ formatMoney(netAmount, payout.currency) }}
          </el-descriptions-item>
          <el-descriptions-item label="Owner">{{ payout.owner?.email || payout.owner_id }}</el-descriptions-item>
          <el-descriptions-item label="Period">
            {{ payout.period_start?.slice(0, 10) || "—" }} → {{ payout.period_end?.slice(0, 10) || "—" }}
          </el-descriptions-item>
          <el-descriptions-item label="Paid at">{{ formatDateTime(payout.paid_at) }}</el-descriptions-item>
          <el-descriptions-item label="Transfer id">
            {{ payout.provider_transfer_id || "—" }}
          </el-descriptions-item>
          <el-descriptions-item label="Connected account">
            {{ payout.connected_payment_account?.provider_account_id || "—" }}
          </el-descriptions-item>
          <el-descriptions-item label="Created">{{ formatDateTime(payout.created_at) }}</el-descriptions-item>
          <el-descriptions-item v-if="payout.failure_message" label="Failure" :span="3">
            {{ payout.failure_code }} — {{ payout.failure_message }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card class="shadow-sm">
        <template #header><span class="font-medium">Items</span></template>
        <el-empty v-if="!payout.items?.length" description="No items" :image-size="60" />
        <el-table v-else :data="payout.items" row-key="id">
          <el-table-column label="Booking" min-width="180">
            <template #default="{ row }">
              <NuxtLink :to="`/bookings/${row.booking_id}`" class="text-emerald-600">
                {{ row.booking_id }}
              </NuxtLink>
            </template>
          </el-table-column>
          <el-table-column label="Gross" align="right">
            <template #default="{ row }">{{ formatMoney(row.gross_amount, row.currency) }}</template>
          </el-table-column>
          <el-table-column label="Platform fee" align="right">
            <template #default="{ row }">{{ formatMoney(row.platform_fee_amount, row.currency) }}</template>
          </el-table-column>
          <el-table-column label="Net" align="right">
            <template #default="{ row }">{{ formatMoney(row.net_amount, row.currency) }}</template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <el-dialog v-model="statusDialog.visible" title="Set payout status" width="440px">
      <el-form label-position="top">
        <el-form-item label="Status">
          <el-select v-model="statusDialog.status" class="w-full">
            <el-option
              v-for="status in availableTransitions"
              :key="status"
              :label="humanize(status)"
              :value="status"
            />
          </el-select>
        </el-form-item>
        <template v-if="statusDialog.status === 'failed'">
          <el-form-item label="Failure code">
            <el-input v-model="statusDialog.failureCode" placeholder="Optional" />
          </el-form-item>
          <el-form-item label="Failure message">
            <el-input v-model="statusDialog.failureMessage" type="textarea" :rows="2" placeholder="Optional" />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="statusDialog.visible = false">Cancel</el-button>
        <el-button type="primary" :loading="submitting" @click="confirmStatus">Save</el-button>
      </template>
    </el-dialog>
  </section>
</template>
