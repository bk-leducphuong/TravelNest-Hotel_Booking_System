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
  isAccountPayoutReady,
  onboardingStatusTagType,
} from "~/utils/payouts";

const auth = useAuthStore();
const { t } = useI18n();

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

const accountTypeOptions = computed(() =>
  ["express", "standard", "custom"].map((value) => ({
    value,
    label: t(`payouts.accountType.${value}`),
  }))
);

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
    ElMessage.warning(t("payouts.connectedAccounts.toast.ownerRequired"));
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
    ElMessage.success(t("payouts.connectedAccounts.toast.created"));
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
    ElMessage.info(t("payouts.connectedAccounts.toast.onboardHint"));
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
};

const sync = async (account: ConnectedAccount) => {
  try {
    await syncConnectedAccount(account.id);
    ElMessage.success(t("payouts.connectedAccounts.toast.synced"));
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
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
          {{ $t("payouts.connectedAccounts.title") }}
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          {{ auth.activeHotel?.name || $t("dashboard.noHotelSelected") }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/payouts"><el-button>{{ $t("nav.payouts") }}</el-button></NuxtLink>
        <Can permission="payment.process">
          <el-button type="primary" :disabled="!auth.activeHotelId" @click="openCreate">
            {{ $t("payouts.connectedAccounts.new") }}
          </el-button>
        </Can>
        <el-button :loading="loading" :disabled="!auth.activeHotelId" @click="load">
          {{ $t("common.refresh") }}
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="readiness && !stripeConfigured"
      type="warning"
      :closable="false"
      show-icon
      :title="$t('payouts.connectedAccounts.stripeTitle')"
    >
      {{ $t("payouts.connectedAccounts.stripeBody") }}
    </el-alert>

    <el-empty
      v-if="!auth.activeHotelId"
      :description="$t('payouts.connectedAccounts.empty.selectHotel')"
    />

    <template v-else>
      <el-card class="shadow-sm">
        <div class="flex flex-wrap items-center gap-3 text-sm">
          <span class="text-slate-500">{{ $t("payouts.connectedAccounts.readiness") }}</span>
          <el-tag v-if="readiness?.payoutReady" type="success" effect="light">
            {{ $t("payouts.connectedAccounts.ready") }}
          </el-tag>
          <el-tag v-else type="warning" effect="light">
            {{ $t("payouts.connectedAccounts.notReady") }}
          </el-tag>
          <span class="text-slate-500">
            {{
              readiness?.hasAccount
                ? $t("payouts.connectedAccounts.accountOnFile")
                : $t("payouts.connectedAccounts.noAccountOnFile")
            }}
          </span>
        </div>
      </el-card>

      <el-card class="shadow-sm">
        <el-table v-loading="loading" :data="accounts" row-key="id">
          <el-table-column :label="$t('payouts.connectedAccounts.col.providerAccount')" min-width="200">
            <template #default="{ row }">{{ row.provider_account_id }}</template>
          </el-table-column>
          <el-table-column :label="$t('payouts.connectedAccounts.col.type')" width="120">
            <template #default="{ row }">
              {{ $t(`payouts.accountType.${row.account_type}`) }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('payouts.connectedAccounts.col.onboarding')" width="150">
            <template #default="{ row }">
              <el-tag :type="onboardingStatusTagType(row.onboarding_status)" effect="light">
                {{ $t(`payouts.onboardingStatus.${row.onboarding_status}`) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="$t('payouts.connectedAccounts.col.payouts')" width="110">
            <template #default="{ row }">
              <el-tag :type="isAccountPayoutReady(row) ? 'success' : 'info'" effect="plain">
                {{
                  row.payouts_enabled
                    ? $t("payouts.connectedAccounts.enabled")
                    : $t("payouts.connectedAccounts.disabled")
                }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="$t('payouts.connectedAccounts.col.default')" width="100">
            <template #default="{ row }">
              {{ row.is_default ? $t("payouts.connectedAccounts.yes") : $t("payouts.connectedAccounts.no") }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('payouts.connectedAccounts.col.lastSynced')" width="180">
            <template #default="{ row }">{{ formatDateTime(row.last_synced_at) }}</template>
          </el-table-column>
          <Can permission="payment.process">
            <el-table-column label="" width="180" align="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="onboard(row)">
                  {{ $t("payouts.connectedAccounts.action.onboard") }}
                </el-button>
                <el-button link @click="sync(row)">
                  {{ $t("payouts.connectedAccounts.action.sync") }}
                </el-button>
              </template>
            </el-table-column>
          </Can>
          <template #empty>
            <el-empty :description="$t('payouts.connectedAccounts.empty.list')" :image-size="60" />
          </template>
        </el-table>
      </el-card>
    </template>

    <el-dialog
      v-model="createDialog.visible"
      :title="$t('payouts.connectedAccounts.dialog.title')"
      width="480px"
    >
      <el-form label-position="top">
        <el-form-item :label="$t('payouts.connectedAccounts.dialog.ownerId')">
          <el-input
            v-model="createDialog.ownerId"
            :placeholder="$t('payouts.connectedAccounts.dialog.ownerIdPlaceholder')"
          />
        </el-form-item>
        <el-form-item :label="$t('payouts.connectedAccounts.dialog.email')">
          <el-input v-model="createDialog.email" placeholder="owner@example.com" />
        </el-form-item>
        <el-form-item :label="$t('payouts.connectedAccounts.dialog.country')">
          <el-input v-model="createDialog.country" maxlength="2" placeholder="US" />
        </el-form-item>
        <el-form-item :label="$t('payouts.connectedAccounts.dialog.accountType')">
          <el-select v-model="createDialog.accountType" class="w-full">
            <el-option
              v-for="option in accountTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('payouts.connectedAccounts.dialog.defaultAccount')">
          <el-switch v-model="createDialog.isDefault" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialog.visible = false">{{ $t("common.cancel") }}</el-button>
        <el-button type="primary" :loading="saving" @click="confirmCreate">
          {{ $t("payouts.connectedAccounts.dialog.create") }}
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>
