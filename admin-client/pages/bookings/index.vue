<script setup lang="ts">
import { Eye } from "lucide-vue-next";
import { fetchBookings, type BookingListItem } from "~/services/api/bookings";
import { BOOKING_STATUSES } from "~/utils/bookings";

const auth = useAuthStore();
const { can } = usePermissions();
const router = useRouter();
const { t } = useI18n();

const overview = ref<{ reload: () => Promise<void> } | null>(null);
const refreshAll = () => Promise.all([load(), overview.value?.reload()]);
const loading = ref(false);
const listError = ref("");
const listRequests = useRequestVersion();
const bookings = ref<BookingListItem[]>([]);
const total = ref(0);

const filters = reactive({
  status: "",
  bookingCode: "",
  dateFrom: "",
  dateTo: "",
  page: 1,
  limit: 20,
});

const statusOptions = computed(() =>
  BOOKING_STATUSES.map((status) => ({
    value: status,
    label: t(`bookings.status.${status}`),
  }))
);

const buyerLabel = (row: BookingListItem) => {
  if (!row.buyer) {
    return "—";
  }
  const name = [row.buyer.first_name, row.buyer.last_name]
    .filter(Boolean)
    .join(" ");
  return name || row.buyer.email || row.buyer.id;
};

const money = (value: string, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    Number(value || 0)
  );

const load = async () => {
  const current = listRequests.begin();
  listError.value = "";
  bookings.value = [];
  total.value = 0;
  loading.value = false;
  if (!auth.activeHotelId || !can("booking.read")) {
    return;
  }
  loading.value = true;
  try {
    const result = await fetchBookings({ ...filters });
    if (!current()) return;
    bookings.value = result.data;
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
  filters.bookingCode = "";
  filters.dateFrom = "";
  filters.dateTo = "";
  filters.page = 1;
  load();
};

const onPageChange = (page: number) => {
  filters.page = page;
  load();
};

const openBooking = (row: BookingListItem) => {
  router.push(`/bookings/${row.id}`);
};

watch(
  [() => auth.activeHotelId, () => can("booking.read")],
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
      :title="$t('nav.bookings')"
      :subtitle="auth.activeHotel?.name || $t('dashboard.noHotelSelected')"
      ><template #actions
        ><el-button
          :loading="loading"
          :disabled="!auth.activeHotelId"
          @click="refreshAll"
        >
          {{ $t("common.refresh") }}
        </el-button></template
      ></UiPageHeader
    >

    <UiEmptyState v-if="!can('booking.read')" :title="$t('editor.forbidden')" />
    <el-empty
      v-else-if="!auth.activeHotelId"
      :description="$t('bookings.empty.selectHotel')"
    />

    <template v-else>
      <MetricsOverview ref="overview" kind="bookings" />
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
            :aria-label="$t('bookings.filter.allStatuses')"
            :placeholder="$t('bookings.filter.allStatuses')"
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
          <el-input
            v-model="filters.bookingCode"
            :aria-label="$t('bookings.filter.bookingCode')"
            :placeholder="$t('bookings.filter.bookingCode')"
            clearable
            class="w-48"
          />
          <el-date-picker
            v-model="filters.dateFrom"
            type="date"
            :aria-label="$t('bookings.filter.from')"
            :placeholder="$t('bookings.filter.from')"
            value-format="YYYY-MM-DD"
          />
          <el-date-picker
            v-model="filters.dateTo"
            type="date"
            :aria-label="$t('bookings.filter.to')"
            :placeholder="$t('bookings.filter.to')"
            value-format="YYYY-MM-DD"
          />
          <el-button type="primary" @click="applyFilters">
            {{ $t("bookings.filter.apply") }}
          </el-button>
          <el-button @click="resetFilters">{{
            $t("bookings.filter.reset")
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
            :data="bookings"
            row-key="id"
            @row-click="openBooking"
          >
            <el-table-column
              prop="booking_code"
              :label="$t('bookings.col.code')"
              width="150"
            />
            <el-table-column :label="$t('bookings.col.guest')" min-width="180">
              <template #default="{ row }">{{
                buyerLabel(row as BookingListItem)
              }}</template>
            </el-table-column>
            <el-table-column :label="$t('bookings.col.stay')" min-width="200">
              <template #default="{ row }"
                >{{ row.check_in_date }} → {{ row.check_out_date }}</template
              >
            </el-table-column>
            <el-table-column :label="$t('bookings.col.room')" min-width="140"
              ><template #default="{ row }">{{
                row.room?.room_name ?? "—"
              }}</template></el-table-column
            >
            <el-table-column
              :label="$t('bookings.col.guestsRooms')"
              width="150"
            >
              <template #default="{ row }"
                >{{ row.number_of_guests }} / {{ row.quantity }}</template
              >
            </el-table-column>
            <el-table-column
              :label="$t('common.total')"
              width="130"
              align="right"
            >
              <template #default="{ row }">{{
                money(row.total_price, row.currency)
              }}</template>
            </el-table-column>
            <el-table-column :label="$t('common.status')" width="140">
              <template #default="{ row }"
                ><BookingStatusTag :status="row.status"
              /></template>
            </el-table-column>
            <el-table-column label="" width="90" align="right">
              <template #default="{ row }">
                <NuxtLink
                  :to="`/bookings/${row.id}`"
                  :aria-label="
                    $t('common.viewRecord', { id: row.booking_code })
                  "
                  @click.stop
                  ><Eye :size="18" aria-hidden="true"
                /></NuxtLink>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty
                :description="$t('bookings.empty.list')"
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
  </section>
</template>
