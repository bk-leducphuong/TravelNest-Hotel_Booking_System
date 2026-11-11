<script setup lang="ts">
import { formatDateTime } from "~/utils/format";
import { BadgePercent, Plus, RefreshCw } from "lucide-vue-next";
import { fetchRooms, type Room } from "~/services/api/catalog";
import {
  activatePromotion,
  archivePromotion,
  createPromotion,
  fetchPromotionRedemptions,
  fetchPromotions,
  pausePromotion,
  updatePromotion,
  type Promotion,
  type PromotionInput,
  type PromotionRedemption,
} from "~/services/api/promotions";

const auth = useAuthStore();
const { can } = usePermissions();
const { t } = useI18n();
const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const promotions = ref<Promotion[]>([]);
const rooms = ref<Room[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const total = ref(0);
const page = ref(1);
const limit = 20;
const filters = reactive({ search: "", mode: "", status: "" });

const dialogVisible = ref(false);
const editing = ref<Promotion | null>(null);
const form = reactive({
  mode: "automatic" as "automatic" | "code",
  code: "",
  name: "",
  description: "",
  discountType: "percentage" as "percentage" | "fixed",
  percent: 20,
  fixedValue: undefined as number | undefined,
  maxDiscountAmount: undefined as number | undefined,
  roomScope: "all" as "all" | "selected",
  roomIds: [] as string[],
  bookingStartsAt: null as Date | null,
  bookingEndsAt: null as Date | null,
  stayStartsOn: "",
  stayEndsOn: "",
  minNights: undefined as number | undefined,
  minSubtotal: undefined as number | undefined,
  minAdvanceDays: undefined as number | undefined,
  totalUseLimit: undefined as number | undefined,
  perUserLimit: undefined as number | undefined,
});

const redemptionVisible = ref(false);
const redemptionLoading = ref(false);
const redemptions = ref<PromotionRedemption[]>([]);
const redemptionPromotion = ref<Promotion | null>(null);

const hotelId = computed(() => auth.activeHotelId || "");
const canManage = computed(() => can("promotion.manage"));
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)));

const asPromotion = (row: unknown) => row as Promotion;

const statusTone = (status: string) =>
  status === "active"
    ? "success"
    : status === "paused"
      ? "warning"
      : status === "archived"
        ? "neutral"
        : "info";

const modeLabel = (mode: string) =>
  mode === "code" ? t("promotions.mode.code") : t("promotions.mode.automatic");

const discountLabel = (row: unknown) => {
  const promotion = row as Promotion;
  if (promotion.discount_type === "percentage") {
    const percent = (Number(promotion.discount_basis_points) || 0) / 100;
    const cap = Number(promotion.max_discount_amount);
    return cap > 0
      ? t("promotions.discount.percentageCapped", {
          percent,
          cap: cap.toFixed(2),
        })
      : t("promotions.discount.percentage", { percent });
  }
  return t("promotions.discount.fixed", {
    amount: Number(promotion.discount_value || 0).toFixed(2),
  });
};

const windowLabel = (row: unknown) => {
  const promotion = row as Promotion;
  if (!promotion.booking_starts_at && !promotion.booking_ends_at) {
    return t("promotions.window.always");
  }
  const format = (value?: string | null) =>
    value ? formatDateTime(value) : t("promotions.window.open");
  return `${format(promotion.booking_starts_at)} → ${format(promotion.booking_ends_at)}`;
};

const load = async () => {
  if (!hotelId.value || !can("promotion.read")) {
    promotions.value = [];
    total.value = 0;
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    const result = await fetchPromotions(hotelId.value, {
      ...filters,
      page: page.value,
      limit,
    });
    promotions.value = result.data;
    total.value = result.meta.total;
  } catch (failure) {
    error.value = (failure as Error).message;
  } finally {
    loading.value = false;
  }
};

const loadRooms = async () => {
  if (!hotelId.value) return;
  try {
    rooms.value = await fetchRooms(hotelId.value);
  } catch {
    rooms.value = [];
  }
};

watch(
  [() => auth.activeHotelId, () => can("promotion.read")],
  () => {
    page.value = 1;
    load();
    loadRooms();
  },
  { immediate: true }
);

watch(filters, () => {
  page.value = 1;
  load();
});

const resetForm = () => {
  Object.assign(form, {
    mode: "automatic",
    code: "",
    name: "",
    description: "",
    discountType: "percentage",
    percent: 20,
    fixedValue: undefined,
    maxDiscountAmount: undefined,
    roomScope: "all",
    roomIds: [],
    bookingStartsAt: null,
    bookingEndsAt: null,
    stayStartsOn: "",
    stayEndsOn: "",
    minNights: undefined,
    minSubtotal: undefined,
    minAdvanceDays: undefined,
    totalUseLimit: undefined,
    perUserLimit: undefined,
  });
};

const openCreate = () => {
  editing.value = null;
  resetForm();
  dialogVisible.value = true;
};

const openEdit = (promotion: Promotion) => {
  if (promotion.status !== "draft") return;
  editing.value = promotion;
  Object.assign(form, {
    mode: promotion.mode,
    code: promotion.code || "",
    name: promotion.name,
    description: promotion.description || "",
    discountType: promotion.discount_type,
    percent:
      promotion.discount_type === "percentage"
        ? (Number(promotion.discount_basis_points) || 0) / 100
        : 20,
    fixedValue:
      promotion.discount_type === "fixed"
        ? Number(promotion.discount_value || 0)
        : undefined,
    maxDiscountAmount:
      promotion.max_discount_amount === null ||
      promotion.max_discount_amount === undefined
        ? undefined
        : Number(promotion.max_discount_amount),
    roomScope: promotion.room_scope,
    roomIds: [...(promotion.room_ids || [])],
    bookingStartsAt: promotion.booking_starts_at
      ? new Date(promotion.booking_starts_at)
      : null,
    bookingEndsAt: promotion.booking_ends_at
      ? new Date(promotion.booking_ends_at)
      : null,
    stayStartsOn: promotion.stay_starts_on || "",
    stayEndsOn: promotion.stay_ends_on || "",
    minNights: promotion.min_nights ?? undefined,
    minSubtotal:
      promotion.min_subtotal === null || promotion.min_subtotal === undefined
        ? undefined
        : Number(promotion.min_subtotal),
    minAdvanceDays: promotion.min_advance_days ?? undefined,
    totalUseLimit: promotion.total_use_limit ?? undefined,
    perUserLimit: promotion.per_user_limit ?? undefined,
  });
  dialogVisible.value = true;
};

const nullableNumber = (value: number | undefined) =>
  value === undefined || value === null || Number.isNaN(value)
    ? null
    : Number(value);

const buildPayload = (): PromotionInput => ({
  mode: form.mode,
  code: form.mode === "code" ? form.code.trim() : null,
  name: form.name.trim(),
  description: form.description || null,
  discountType: form.discountType,
  discountBasisPoints:
    form.discountType === "percentage"
      ? Math.round(Number(form.percent) * 100)
      : null,
  discountValue: form.discountType === "fixed" ? Number(form.fixedValue) : null,
  maxDiscountAmount:
    form.discountType === "percentage"
      ? nullableNumber(form.maxDiscountAmount)
      : null,
  roomScope: form.mode === "code" ? "all" : form.roomScope,
  roomIds:
    form.mode === "automatic" && form.roomScope === "selected"
      ? form.roomIds
      : [],
  bookingStartsAt: form.bookingStartsAt
    ? form.bookingStartsAt.toISOString()
    : null,
  bookingEndsAt: form.bookingEndsAt ? form.bookingEndsAt.toISOString() : null,
  stayStartsOn: form.stayStartsOn || null,
  stayEndsOn: form.stayEndsOn || null,
  minNights: nullableNumber(form.minNights),
  minSubtotal: nullableNumber(form.minSubtotal),
  minAdvanceDays: nullableNumber(form.minAdvanceDays),
  totalUseLimit:
    form.mode === "code" ? nullableNumber(form.totalUseLimit) : null,
  perUserLimit: form.mode === "code" ? nullableNumber(form.perUserLimit) : null,
});

const save = async () => {
  if (!hotelId.value || saving.value) return;
  saving.value = true;
  try {
    if (editing.value) {
      await updatePromotion(
        hotelId.value,
        editing.value.id,
        editing.value.version,
        buildPayload()
      );
      ElMessage.success(t("promotions.toast.saved"));
    } else {
      await createPromotion(hotelId.value, buildPayload());
      ElMessage.success(t("promotions.toast.created"));
    }
    dialogVisible.value = false;
    await load();
  } catch (failure) {
    ElMessage.error((failure as Error).message);
  } finally {
    saving.value = false;
  }
};

const runTransition = async (
  promotion: Promotion,
  action: "activate" | "pause" | "archive"
) => {
  if (!hotelId.value) return;
  try {
    const label = t(`promotions.actions.${action}`);
    await ElMessageBox.confirm(
      t("promotions.confirm", { action: label, name: promotion.name }),
      label,
      { confirmButtonText: label, cancelButtonText: t("common.cancel") }
    );
    if (action === "activate")
      await activatePromotion(hotelId.value, promotion.id);
    if (action === "pause") await pausePromotion(hotelId.value, promotion.id);
    if (action === "archive")
      await archivePromotion(hotelId.value, promotion.id);
    ElMessage.success(t("promotions.toast.updated"));
    await load();
  } catch (failure) {
    if (failure !== "cancel" && failure !== "close") {
      ElMessage.error((failure as Error).message);
    }
  }
};

const openRedemptions = async (promotion: Promotion) => {
  redemptionPromotion.value = promotion;
  redemptionVisible.value = true;
  redemptionLoading.value = true;
  redemptions.value = [];
  try {
    const result = await fetchPromotionRedemptions(
      hotelId.value,
      promotion.id,
      {
        page: 1,
        limit: 50,
      }
    );
    redemptions.value = result.data;
  } catch (failure) {
    ElMessage.error((failure as Error).message);
  } finally {
    redemptionLoading.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <UiPageHeader
      :title="$t('promotions.title')"
      :subtitle="$t('promotions.subtitle')"
    >
      <template #actions>
        <el-button :icon="RefreshCw" :loading="loading" @click="load">
          {{ $t("common.refresh") }}
        </el-button>
        <el-button
          v-if="canManage"
          type="primary"
          :icon="Plus"
          @click="openCreate"
        >
          {{ $t("promotions.create") }}
        </el-button>
      </template>
    </UiPageHeader>

    <UiSectionCard>
      <UiFilterBar>
        <el-input
          v-model="filters.search"
          clearable
          :aria-label="$t('promotions.filters.search')"
          :placeholder="$t('promotions.filters.search')"
          class="w-64"
        />
        <el-select
          v-model="filters.mode"
          clearable
          :aria-label="$t('promotions.filters.mode')"
          :placeholder="$t('promotions.filters.mode')"
          class="w-44"
        >
          <el-option
            :label="$t('promotions.mode.automatic')"
            value="automatic"
          />
          <el-option :label="$t('promotions.mode.code')" value="code" />
        </el-select>
        <el-select
          v-model="filters.status"
          clearable
          :aria-label="$t('promotions.filters.status')"
          :placeholder="$t('promotions.filters.status')"
          class="w-44"
        >
          <el-option :label="$t('promotions.status.draft')" value="draft" />
          <el-option :label="$t('promotions.status.active')" value="active" />
          <el-option :label="$t('promotions.status.paused')" value="paused" />
          <el-option
            :label="$t('promotions.status.archived')"
            value="archived"
          />
        </el-select>
      </UiFilterBar>

      <p v-if="!hotelId" class="py-10 text-center text-sm text-muted">
        {{ $t("common.noHotelSelected") }}
      </p>
      <UiEmptyState
        v-else-if="!loading && !promotions.length"
        :title="$t('promotions.empty.title')"
        :description="$t('promotions.empty.description')"
      />
      <div
        v-else
        class="tn-table-region"
        role="region"
        :aria-label="$t('promotions.title')"
        tabindex="0"
      >
        <el-table v-loading="loading" :data="promotions" row-key="id">
          <el-table-column :label="$t('promotions.col.name')" min-width="220">
            <template #default="{ row }">
              <div class="flex items-center gap-2">
                <BadgePercent
                  :size="16"
                  class="text-action"
                  aria-hidden="true"
                />
                <div>
                  <p class="font-medium">{{ row.name }}</p>
                  <p class="text-xs text-muted">
                    {{ modeLabel(row.mode) }}
                    <span v-if="row.code"> · {{ row.code }}</span>
                  </p>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('promotions.col.discount')"
            min-width="180"
          >
            <template #default="{ row }">{{ discountLabel(row) }}</template>
          </el-table-column>
          <el-table-column :label="$t('promotions.col.window')" min-width="240">
            <template #default="{ row }">{{ windowLabel(row) }}</template>
          </el-table-column>
          <el-table-column
            :label="$t('promotions.col.usage')"
            width="140"
            align="center"
          >
            <template #default="{ row }">
              <span class="text-sm">
                {{ row.redeemed_count }}
                <span class="text-muted"
                  >/ {{ row.total_use_limit || "∞" }}</span
                >
              </span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('promotions.col.status')" width="120">
            <template #default="{ row }">
              <UiStatusPill :tone="statusTone(row.status)">
                {{ $t(`promotions.status.${row.status}`) }}
              </UiStatusPill>
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('promotions.col.actions')"
            fixed="right"
            width="160"
            align="right"
          >
            <template #default="{ row }">
              <el-button
                link
                type="primary"
                @click="openRedemptions(asPromotion(row))"
              >
                {{ $t("promotions.actions.usage") }}
              </el-button>
              <el-button
                v-if="row.status === 'draft' && canManage"
                link
                type="primary"
                @click="openEdit(asPromotion(row))"
              >
                {{ $t("common.edit") }}
              </el-button>
              <el-button
                v-if="
                  (row.status === 'draft' || row.status === 'paused') &&
                  canManage
                "
                link
                type="success"
                @click="runTransition(asPromotion(row), 'activate')"
              >
                {{ $t("promotions.actions.activate") }}
              </el-button>
              <el-button
                v-if="row.status === 'active' && canManage"
                link
                type="warning"
                @click="runTransition(asPromotion(row), 'pause')"
              >
                {{ $t("promotions.actions.pause") }}
              </el-button>
              <el-button
                v-if="row.status !== 'archived' && canManage"
                link
                type="danger"
                @click="runTransition(asPromotion(row), 'archive')"
              >
                {{ $t("promotions.actions.archive") }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div v-if="total > limit" class="mt-4 flex items-center justify-between">
        <p class="text-sm text-muted">
          {{
            $t("promotions.pagination", {
              page: page,
              pages: totalPages,
              total,
            })
          }}
        </p>
        <el-pagination
          v-model:current-page="page"
          :page-size="limit"
          :total="total"
          layout="prev, pager, next"
          @current-change="load"
        />
      </div>
      <p v-if="error" role="alert" class="mt-4 text-sm text-red-600">
        {{ error }}
      </p>
    </UiSectionCard>

    <el-dialog
      v-model="dialogVisible"
      :title="
        editing ? $t('promotions.editTitle') : $t('promotions.createTitle')
      "
      width="min(94%, 680px)"
      destroy-on-close
    >
      <p class="mb-4 text-xs text-muted">
        {{ $t("promotions.form.timezoneHint", { timezone: browserTimezone }) }}
      </p>
      <el-form label-position="top" class="grid gap-4 md:grid-cols-2">
        <el-form-item :label="$t('promotions.form.mode')" required>
          <el-radio-group v-model="form.mode" :disabled="!!editing">
            <el-radio value="automatic">{{
              $t("promotions.mode.automatic")
            }}</el-radio>
            <el-radio value="code">{{ $t("promotions.mode.code") }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          v-if="form.mode === 'code'"
          :label="$t('promotions.form.code')"
          required
        >
          <el-input v-model="form.code" maxlength="64" :disabled="!!editing" />
        </el-form-item>
        <el-form-item
          :label="$t('promotions.form.name')"
          required
          class="md:col-span-2"
        >
          <el-input v-model="form.name" maxlength="150" />
        </el-form-item>
        <el-form-item
          :label="$t('promotions.form.description')"
          class="md:col-span-2"
        >
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
            maxlength="5000"
          />
        </el-form-item>

        <el-form-item :label="$t('promotions.form.discountType')" required>
          <el-select v-model="form.discountType">
            <el-option
              :label="$t('promotions.discount.percentageLabel')"
              value="percentage"
            />
            <el-option
              :label="$t('promotions.discount.fixedLabel')"
              value="fixed"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="form.discountType === 'percentage'"
          :label="$t('promotions.form.percent')"
          required
        >
          <el-input-number
            v-model="form.percent"
            :min="0.01"
            :max="100"
            :step="1"
            class="w-full"
          />
        </el-form-item>
        <el-form-item v-else :label="$t('promotions.form.fixedValue')" required>
          <el-input-number
            v-model="form.fixedValue"
            :min="0.01"
            :step="1"
            class="w-full"
          />
        </el-form-item>
        <el-form-item
          v-if="form.discountType === 'percentage'"
          :label="$t('promotions.form.maxDiscount')"
        >
          <el-input-number
            v-model="form.maxDiscountAmount"
            :min="0"
            :step="1"
            class="w-full"
          />
        </el-form-item>

        <template v-if="form.mode === 'automatic'">
          <el-form-item :label="$t('promotions.form.roomScope')">
            <el-select v-model="form.roomScope">
              <el-option :label="$t('promotions.roomScope.all')" value="all" />
              <el-option
                :label="$t('promotions.roomScope.selected')"
                value="selected"
              />
            </el-select>
          </el-form-item>
          <el-form-item
            v-if="form.roomScope === 'selected'"
            :label="$t('promotions.form.rooms')"
            class="md:col-span-2"
            required
          >
            <el-select
              v-model="form.roomIds"
              multiple
              filterable
              class="w-full"
            >
              <el-option
                v-for="room in rooms"
                :key="room.id"
                :label="room.room_name"
                :value="room.id"
              />
            </el-select>
          </el-form-item>
        </template>

        <el-form-item :label="$t('promotions.form.bookingStart')">
          <el-date-picker
            v-model="form.bookingStartsAt"
            type="datetime"
            class="w-full"
            :placeholder="$t('promotions.window.open')"
          />
        </el-form-item>
        <el-form-item :label="$t('promotions.form.bookingEnd')">
          <el-date-picker
            v-model="form.bookingEndsAt"
            type="datetime"
            class="w-full"
            :placeholder="$t('promotions.window.open')"
          />
        </el-form-item>
        <el-form-item :label="$t('promotions.form.stayStart')">
          <el-date-picker
            v-model="form.stayStartsOn"
            type="date"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </el-form-item>
        <el-form-item :label="$t('promotions.form.stayEnd')">
          <el-date-picker
            v-model="form.stayEndsOn"
            type="date"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </el-form-item>

        <el-form-item :label="$t('promotions.form.minNights')">
          <el-input-number v-model="form.minNights" :min="1" class="w-full" />
        </el-form-item>
        <el-form-item :label="$t('promotions.form.minSubtotal')">
          <el-input-number v-model="form.minSubtotal" :min="0" class="w-full" />
        </el-form-item>
        <el-form-item :label="$t('promotions.form.minAdvanceDays')">
          <el-input-number
            v-model="form.minAdvanceDays"
            :min="0"
            class="w-full"
          />
        </el-form-item>

        <template v-if="form.mode === 'code'">
          <el-form-item :label="$t('promotions.form.totalUseLimit')">
            <el-input-number
              v-model="form.totalUseLimit"
              :min="1"
              class="w-full"
            />
          </el-form-item>
          <el-form-item :label="$t('promotions.form.perUserLimit')">
            <el-input-number
              v-model="form.perUserLimit"
              :min="1"
              class="w-full"
            />
          </el-form-item>
        </template>
      </el-form>
      <p class="text-xs text-muted">
        {{ $t("promotions.form.bestOfferNote") }}
      </p>
      <template #footer>
        <el-button @click="dialogVisible = false">{{
          $t("common.cancel")
        }}</el-button>
        <el-button type="primary" :loading="saving" @click="save">
          {{ $t("common.save") }}
        </el-button>
      </template>
    </el-dialog>

    <el-drawer
      v-model="redemptionVisible"
      :title="
        $t('promotions.redemptions.title', {
          name: redemptionPromotion?.name || '',
        })
      "
      size="min(94%, 620px)"
    >
      <el-table v-loading="redemptionLoading" :data="redemptions" row-key="id">
        <el-table-column
          :label="$t('promotions.redemptions.code')"
          min-width="140"
        >
          <template #default="{ row }">{{
            row.booking?.booking_code || "—"
          }}</template>
        </el-table-column>
        <el-table-column
          :label="$t('promotions.redemptions.status')"
          width="120"
        >
          <template #default="{ row }">{{
            $t(`promotions.redemptionStatus.${row.status}`)
          }}</template>
        </el-table-column>
        <el-table-column
          :label="$t('promotions.redemptions.discount')"
          width="120"
          align="right"
        >
          <template #default="{ row }">{{
            Number(row.discount_amount).toFixed(2)
          }}</template>
        </el-table-column>
        <el-table-column
          :label="$t('promotions.redemptions.buyer')"
          min-width="180"
        >
          <template #default="{ row }">
            {{
              row.buyer?.email ||
              [row.buyer?.first_name, row.buyer?.last_name]
                .filter(Boolean)
                .join(" ") ||
              "—"
            }}
          </template>
        </el-table-column>
      </el-table>
    </el-drawer>
  </div>
</template>
