<script setup lang="ts">
import { Eye } from "lucide-vue-next";
import {
  fetchPayouts,
  generateEligiblePayouts,
  type PayoutListItem,
} from "~/services/api/payouts";
import { formatDateTime, formatMoney } from "~/utils/format";
import { PAYOUT_STATUSES, payoutStatusTagType } from "~/utils/payouts";

const auth = useAuthStore();
const { can } = usePermissions();
const router = useRouter();
const { t } = useI18n();

const overview = ref<{ reload: () => Promise<void> } | null>(null);
const refreshAll = () => Promise.all([load(), overview.value?.reload()]);
const loading = ref(false);
const listError = ref("");
const listRequests = useRequestVersion();
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
  const current = listRequests.begin();
  listError.value = "";
  payouts.value = [];
  total.value = 0;
  loading.value = false;
  if (!auth.activeHotelId || !can("payment.read")) {
    return;
  }
  loading.value = true;
  try {
    const result = await fetchPayouts({ ...filters });
    if (!current()) return;
    payouts.value = result.data;
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

const openPayout = (row: PayoutListItem) => router.push(`/payouts/${row.id}`);

const openGenerate = () => {
  generateDialog.cutoffDate = "";
  generateDialog.visible = true;
};

useEditorGuard(
  "payout-generate",
  computed(() => generateDialog.visible),
  generating
);
const confirmGenerate = async () => {
  if (generating.value || !can("payment.process")) return;
  generating.value = true;
  try {
    const result = await generateEligiblePayouts({
      cutoffDate: generateDialog.cutoffDate || undefined,
    });
    ElMessage.success(
      t("payouts.toast.generated", {
        scanned: result.scanned,
        created: result.created,
      })
    );
    generateDialog.visible = false;
    await refreshAll();
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    generating.value = false;
  }
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
      :title="$t('nav.payouts')"
      :subtitle="auth.activeHotel?.name || $t('dashboard.noHotelSelected')"
      ><template #actions
        ><div class="flex flex-wrap items-center gap-2">
          <NuxtLink to="/payouts/connected-accounts">
            <el-button>{{ $t("payouts.connectedAccountsLink") }}</el-button>
          </NuxtLink>
          <Can permission="payment.process">
            <el-button
              type="primary"
              :disabled="!auth.activeHotelId"
              @click="openGenerate"
            >
              {{ $t("payouts.action.generate") }}
            </el-button>
          </Can>
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
      :description="$t('payouts.empty.selectHotel')"
    />

    <template v-else>
      <MetricsOverview ref="overview" kind="payouts" distribution />
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
            :aria-label="$t('payouts.filter.allStatuses')"
            :placeholder="$t('payouts.filter.allStatuses')"
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
            :aria-label="$t('payouts.filter.from')"
            :placeholder="$t('payouts.filter.from')"
            value-format="YYYY-MM-DD"
          />
          <el-date-picker
            v-model="filters.dateTo"
            type="date"
            :aria-label="$t('payouts.filter.to')"
            :placeholder="$t('payouts.filter.to')"
            value-format="YYYY-MM-DD"
          />
          <el-button type="primary" @click="applyFilters">
            {{ $t("payouts.filter.apply") }}
          </el-button>
          <el-button @click="resetFilters">{{
            $t("payouts.filter.reset")
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
            :data="payouts"
            row-key="id"
            @row-click="openPayout"
          >
            <el-table-column :label="$t('payouts.col.created')" width="170">
              <template #default="{ row }">{{
                formatDateTime(row.created_at)
              }}</template>
            </el-table-column>
            <el-table-column
              :label="$t('payouts.col.amount')"
              width="140"
              align="right"
            >
              <template #default="{ row }">{{
                formatMoney(row.amount, row.currency)
              }}</template>
            </el-table-column>
            <el-table-column
              :label="$t('payouts.col.platformFee')"
              width="140"
              align="right"
            >
              <template #default="{ row }">{{
                formatMoney(row.platform_fee_amount, row.currency)
              }}</template>
            </el-table-column>
            <el-table-column :label="$t('common.status')" width="140">
              <template #default="{ row }">
                <el-tag :type="payoutStatusTagType(row.status)" effect="light">
                  {{ $t(`payouts.status.${row.status}`) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              :label="$t('payouts.col.transferId')"
              min-width="180"
            >
              <template #default="{ row }">{{
                row.provider_transfer_id || "—"
              }}</template>
            </el-table-column>
            <el-table-column
              :label="$t('common.actions')"
              width="90"
              align="right"
            >
              <template #default="{ row }">
                <NuxtLink
                  :to="`/payouts/${row.id}`"
                  :aria-label="$t('common.viewRecord', { id: row.id })"
                  @click.stop
                  ><Eye :size="18" aria-hidden="true"
                /></NuxtLink>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty
                :description="$t('payouts.empty.list')"
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
      v-model="generateDialog.visible"
      :title="$t('payouts.dialog.generateTitle')"
      width="420px"
    >
      <el-form label-position="top">
        <el-form-item :label="$t('payouts.dialog.cutoff')">
          <el-date-picker
            v-model="generateDialog.cutoffDate"
            type="date"
            :aria-label="$t('payouts.dialog.today')"
            :placeholder="$t('payouts.dialog.today')"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </el-form-item>
        <p class="text-xs text-muted">
          {{ $t("payouts.dialog.generateHint") }}
        </p>
      </el-form>
      <template #footer>
        <el-button @click="generateDialog.visible = false">{{
          $t("common.cancel")
        }}</el-button>
        <el-button
          type="primary"
          :loading="generating"
          @click="confirmGenerate"
        >
          {{ $t("payouts.dialog.generate") }}
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>
