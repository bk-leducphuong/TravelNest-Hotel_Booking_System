<script setup lang="ts">
import {
  checkConnectedAccount,
  createAccountLink,
  createConnectAccount,
  fetchConnectedAccounts,
  syncConnectedAccount,
  type ConnectedAccount,
  type ConnectedAccountCheck,
} from "~/services/api/payouts";
import { formatDateTime } from "~/utils/format";
import {
  humanize,
  isAccountPayoutReady,
  onboardingStatusTagType,
} from "~/utils/payouts";

const auth = useAuthStore();
const { can } = usePermissions();

const loading = ref(false);
const saving = ref(false);
const accounts = ref<ConnectedAccount[]>([]);
const readiness = ref<ConnectedAccountCheck | null>(null);

const createDialog = reactive({
  visible: false,
  ownerId: "",
  email: "",
  country: "",
  accountType: "express",
  isDefault: true,
});

const accountTypeOptions = ["express", "standard", "custom"].map((value) => ({
  value,
  label: humanize(value),
}));

const stripeConfigured = computed(() => readiness.value?.configured ?? true);

const load = async () => {
  if (!auth.activeHotelId) {
    return;
  }
  loading.value = true;
  try {
    const [accountsResult, check] = await Promise.all([
      fetchConnectedAccounts({ hotelId: auth.activeHotelId }),
      checkConnectedAccount({ hotelId: auth.activeHotelId }),
    ]);
    accounts.value = accountsResult;
    readiness.value = check;
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  createDialog.ownerId = "";
  createDialog.email = "";
  createDialog.country = "";
  createDialog.accountType = "express";
  createDialog.isDefault = true;
  createDialog.visible = true;
};

const confirmCreate = async () => {
  if (!createDialog.ownerId) {
    ElMessage.warning("Owner user id is required");
    return;
  }
  saving.value = true;
  try {
    await createConnectAccount({
      ownerId: createDialog.ownerId,
      hotelId: auth.activeHotelId ?? undefined,
      email: createDialog.email || undefined,
      country: createDialog.country || undefined,
      accountType: createDialog.accountType,
      isDefault: createDialog.isDefault,
    });
    ElMessage.success("Connected account created");
    createDialog.visible = false;
    await load();
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    saving.value = false;
  }
};

const onboard = async (account: ConnectedAccount) => {
  try {
    const link = await createAccountLink(account.id);
    window.open(link.url, "_blank", "noopener");
    ElMessage.info("Complete onboarding in the new tab, then Sync.");
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
};

const sync = async (account: ConnectedAccount) => {
  try {
    await syncConnectedAccount(account.id);
    ElMessage.success("Account synced with Stripe");
    await load();
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
};

watch(
  () => auth.activeHotelId,
  () => load(),
  { immediate: true }
);
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Connected accounts</h2>
        <p class="mt-1 text-sm text-slate-500">{{ auth.activeHotel?.name || "No hotel selected" }}</p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/payouts"><el-button>Payouts</el-button></NuxtLink>
        <Can permission="payment.process">
          <el-button type="primary" :disabled="!auth.activeHotelId" @click="openCreate">
            New account
          </el-button>
        </Can>
        <el-button :loading="loading" :disabled="!auth.activeHotelId" @click="load">Refresh</el-button>
      </div>
    </div>

    <el-alert
      v-if="readiness && !stripeConfigured"
      type="warning"
      :closable="false"
      show-icon
      title="Stripe is not configured"
    >
      Payout operations are unavailable until the server has a Stripe secret key.
    </el-alert>

    <el-empty v-if="!auth.activeHotelId" description="Select a hotel to manage payout accounts." />

    <template v-else>
      <el-card class="shadow-sm">
        <div class="flex flex-wrap items-center gap-3 text-sm">
          <span class="text-slate-500">Payout readiness:</span>
          <el-tag v-if="readiness?.payoutReady" type="success" effect="light">Ready</el-tag>
          <el-tag v-else type="warning" effect="light">Not ready</el-tag>
          <span class="text-slate-500">
            {{ readiness?.hasAccount ? "Account on file" : "No account on file" }}
          </span>
        </div>
      </el-card>

      <el-card class="shadow-sm">
        <el-table v-loading="loading" :data="accounts" row-key="id">
          <el-table-column label="Provider account" min-width="200">
            <template #default="{ row }">{{ row.provider_account_id }}</template>
          </el-table-column>
          <el-table-column label="Type" width="120">
            <template #default="{ row }">{{ humanize(row.account_type) }}</template>
          </el-table-column>
          <el-table-column label="Onboarding" width="150">
            <template #default="{ row }">
              <el-tag :type="onboardingStatusTagType(row.onboarding_status)" effect="light">
                {{ humanize(row.onboarding_status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Payouts" width="110">
            <template #default="{ row }">
              <el-tag :type="isAccountPayoutReady(row) ? 'success' : 'info'" effect="plain">
                {{ row.payouts_enabled ? "Enabled" : "Disabled" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Default" width="100">
            <template #default="{ row }">{{ row.is_default ? "Yes" : "No" }}</template>
          </el-table-column>
          <el-table-column label="Last synced" width="180">
            <template #default="{ row }">{{ formatDateTime(row.last_synced_at) }}</template>
          </el-table-column>
          <Can permission="payment.process">
            <el-table-column label="" width="180" align="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="onboard(row)">Onboard</el-button>
                <el-button link @click="sync(row)">Sync</el-button>
              </template>
            </el-table-column>
          </Can>
          <template #empty>
            <el-empty description="No connected accounts" :image-size="60" />
          </template>
        </el-table>
      </el-card>
    </template>

    <el-dialog v-model="createDialog.visible" title="New connected account" width="480px">
      <el-form label-position="top">
        <el-form-item label="Owner user id (required)">
          <el-input v-model="createDialog.ownerId" placeholder="UUID of the hotel owner" />
        </el-form-item>
        <el-form-item label="Email">
          <el-input v-model="createDialog.email" placeholder="owner@example.com" />
        </el-form-item>
        <el-form-item label="Country (ISO-2)">
          <el-input v-model="createDialog.country" maxlength="2" placeholder="US" />
        </el-form-item>
        <el-form-item label="Account type">
          <el-select v-model="createDialog.accountType" class="w-full">
            <el-option
              v-for="option in accountTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Default payout account">
          <el-switch v-model="createDialog.isDefault" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialog.visible = false">Cancel</el-button>
        <el-button type="primary" :loading="saving" @click="confirmCreate">Create</el-button>
      </template>
    </el-dialog>
  </section>
</template>
