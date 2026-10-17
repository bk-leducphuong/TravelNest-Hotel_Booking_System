<script setup lang="ts">
import { fetchBookings, type BookingListItem } from "~/services/api/bookings";
import { BOOKING_STATUSES } from "~/utils/bookings";

const auth = useAuthStore();
const router = useRouter();
const { t } = useI18n();

const loading = ref(false);
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
  const name = [row.buyer.first_name, row.buyer.last_name].filter(Boolean).join(" ");
  return name || row.buyer.email || row.buyer.id;
};

const money = (value: string, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value || 0));

const load = async () => {
  if (!auth.activeHotelId) {
    return;
  }
  loading.value = true;
  try {
    const result = await fetchBookings({ ...filters });
    bookings.value = result.data;
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
          {{ $t("nav.bookings") }}
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          {{ auth.activeHotel?.name || $t("dashboard.noHotelSelected") }}
        </p>
      </div>
      <el-button :loading="loading" :disabled="!auth.activeHotelId" @click="load">
        {{ $t("common.refresh") }}
      </el-button>
    </div>

    <el-empty
      v-if="!auth.activeHotelId"
      :description="$t('bookings.empty.selectHotel')"
    />

    <template v-else>
      <el-card class="shadow-sm">
        <div class="flex flex-wrap items-end gap-3">
          <el-select
            v-model="filters.status"
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
            :placeholder="$t('bookings.filter.bookingCode')"
            clearable
            class="w-48"
          />
          <el-date-picker
            v-model="filters.dateFrom"
            type="date"
            :placeholder="$t('bookings.filter.from')"
            value-format="YYYY-MM-DD"
          />
          <el-date-picker
            v-model="filters.dateTo"
            type="date"
            :placeholder="$t('bookings.filter.to')"
            value-format="YYYY-MM-DD"
          />
          <el-button type="primary" @click="applyFilters">
            {{ $t("bookings.filter.apply") }}
          </el-button>
          <el-button @click="resetFilters">{{ $t("bookings.filter.reset") }}</el-button>
        </div>
      </el-card>

      <el-card class="shadow-sm">
        <el-table v-loading="loading" :data="bookings" row-key="id" @row-click="openBooking">
          <el-table-column prop="booking_code" :label="$t('bookings.col.code')" width="150" />
          <el-table-column :label="$t('bookings.col.guest')" min-width="180">
            <template #default="{ row }">{{ buyerLabel(row) }}</template>
          </el-table-column>
          <el-table-column :label="$t('bookings.col.stay')" min-width="200">
            <template #default="{ row }">{{ row.check_in_date }} → {{ row.check_out_date }}</template>
          </el-table-column>
          <el-table-column :label="$t('bookings.col.guestsRooms')" width="150">
            <template #default="{ row }">{{ row.number_of_guests }} / {{ row.quantity }}</template>
          </el-table-column>
          <el-table-column :label="$t('common.total')" width="130" align="right">
            <template #default="{ row }">{{ money(row.total_price, row.currency) }}</template>
          </el-table-column>
          <el-table-column :label="$t('common.status')" width="140">
            <template #default="{ row }"><BookingStatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column label="" width="90" align="right">
            <template #default="{ row }">
              <el-button link type="primary" @click.stop="openBooking(row)">
                {{ $t("common.view") }}
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty :description="$t('bookings.empty.list')" :image-size="60" />
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
  </section>
</template>
