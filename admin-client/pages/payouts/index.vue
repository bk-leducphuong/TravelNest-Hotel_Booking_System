<script setup lang="ts">
import {
  fetchPayouts,
  generateEligiblePayouts,
  type PayoutListItem,
} from "~/services/api/payouts";
import { formatDateTime, formatMoney } from "~/utils/format";
import { PAYOUT_STATUSES, payoutStatusTagType } from "~/utils/payouts";

const auth = useAuthStore();
const router = useRouter();
const { t } = useI18n();

const loading = ref(false);
const generating = ref(false);
const payouts = ref<PayoutListItem[]>([]);
const total = ref(0);

const filters = reactive({
  status: "",
  dateFrom: "",
  dateTo: "",
  page: 1,
  limit: 20,
});

const generateDialog = reactive({ visible: false, cutoffDate: "" });

const statusOptions = computed(() =>
  PAYOUT_STATUSES.map((status) => ({
    value: status,
    label: t(`payouts.status.${status}`),
  }))
);

const load = async () => {
  if (!auth.activeHotelId) {
    return;
  }
  loading.value = true;
  try {
    const result = await fetchPayouts({ ...filters });
    payouts.value = result.data;
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

const openPayout = (row: PayoutListItem) => router.push(`/payouts/${row.id}`);

const openGenerate = () => {
  generateDialog.cutoffDate = "";
  generateDialog.visible = true;
};

const confirmGenerate = async () => {
  generating.value = true;
  try {
    const result = await generateEligiblePayouts({
      cutoffDate: generateDialog.cutoffDate || undefined,
    });
    ElMessage.success(
      t("payouts.toast.generated", { scanned: result.scanned, created: result.created })
    );
    generateDialog.visible = false;
    await load();
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    generating.value = false;
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
          {{ $t("nav.payouts") }}
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          {{ auth.activeHotel?.name || $t("dashboard.noHotelSelected") }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink to="/payouts/connected-accounts">
          <el-button>{{ $t("payouts.connectedAccountsLink") }}</el-button>
        </NuxtLink>
        <Can permission="payment.process">
          <el-button type="primary" :disabled="!auth.activeHotelId" @click="openGenerate">
            {{ $t("payouts.action.generate") }}
          </el-button>
        </Can>
        <el-button :loading="loading" :disabled="!auth.activeHotelId" @click="load">
          {{ $t("common.refresh") }}
        </el-button>
      </div>
    </div>

    <el-empty v-if="!auth.activeHotelId" :description="$t('payouts.empty.selectHotel')" />

    <template v-else>
      <el-card class="shadow-sm">
        <div class="flex flex-wrap items-end gap-3">
          <el-select
            v-model="filters.status"
            :placeholder="$t('payouts.filter.allStatuses')"
            clearable
            class="w-48"
          >
            <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
          <el-date-picker
            v-model="filters.dateFrom"
            type="date"
            :placeholder="$t('payouts.filter.from')"
            value-format="YYYY-MM-DD"
          />
          <el-date-picker
            v-model="filters.dateTo"
            type="date"
            :placeholder="$t('payouts.filter.to')"
            value-format="YYYY-MM-DD"
          />
          <el-button type="primary" @click="applyFilters">
            {{ $t("payouts.filter.apply") }}
          </el-button>
          <el-button @click="resetFilters">{{ $t("payouts.filter.reset") }}</el-button>
        </div>
      </el-card>

      <el-card class="shadow-sm">
        <el-table v-loading="loading" :data="payouts" row-key="id" @row-click="openPayout">
          <el-table-column :label="$t('payouts.col.created')" width="170">
            <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column :label="$t('payouts.col.amount')" width="140" align="right">
            <template #default="{ row }">{{ formatMoney(row.amount, row.currency) }}</template>
          </el-table-column>
          <el-table-column :label="$t('payouts.col.platformFee')" width="140" align="right">
            <template #default="{ row }">{{ formatMoney(row.platform_fee_amount, row.currency) }}</template>
          </el-table-column>
          <el-table-column :label="$t('common.status')" width="140">
            <template #default="{ row }">
              <el-tag :type="payoutStatusTagType(row.status)" effect="light">
                {{ $t(`payouts.status.${row.status}`) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="$t('payouts.col.transferId')" min-width="180">
            <template #default="{ row }">{{ row.provider_transfer_id || "—" }}</template>
          </el-table-column>
          <el-table-column label="" width="90" align="right">
            <template #default="{ row }">
              <el-button link type="primary" @click.stop="openPayout(row)">
                {{ $t("common.view") }}
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty :description="$t('payouts.empty.list')" :image-size="60" />
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

    <el-dialog
      v-model="generateDialog.visible"
      :title="$t('payouts.dialog.generateTitle')"
      width="420px"
    >
      <el-form label-position="top">
        <el-form-item :label="$t('payouts.dialog.cutoff')">
          <el-date-picker
            v-model="generateDialog.cutoffDate"
            type="date"
            :placeholder="$t('payouts.dialog.today')"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </el-form-item>
        <p class="text-xs text-slate-500">
          {{ $t("payouts.dialog.generateHint") }}
        </p>
      </el-form>
      <template #footer>
        <el-button @click="generateDialog.visible = false">{{ $t("common.cancel") }}</el-button>
        <el-button type="primary" :loading="generating" @click="confirmGenerate">
          {{ $t("payouts.dialog.generate") }}
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>
