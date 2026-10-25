<script setup lang="ts">
import { CalendarDays, BedDouble, Star, Wallet } from "lucide-vue-next";
import {
  fetchBookingStats,
  fetchBookingTrend,
  fetchBookings,
} from "~/services/api/bookings";
import { fetchOccupancy } from "~/services/api/inventory";
import { fetchReviewSummary } from "~/services/api/reviews";
import { fetchPaymentSummary } from "~/services/api/payments";
const auth = useAuthStore();
const { can } = usePermissions();
const { t } = useI18n();
const stats = useHotelSummary("booking.read", fetchBookingStats);
const trend = useHotelSummary("booking.read", (id) =>
  fetchBookingTrend(id, 14)
);
const inventory = useHotelSummary("room.read", fetchOccupancy);
const reviews = useHotelSummary("review.read", fetchReviewSummary);
const payments = useHotelSummary("payment.read", fetchPaymentSummary);
const recent = useHotelSummary("booking.read", () =>
  fetchBookings({ limit: 5, page: 1 })
);
const loading = computed(
  () =>
    stats.loading.value ||
    trend.loading.value ||
    inventory.loading.value ||
    reviews.loading.value ||
    payments.loading.value ||
    recent.loading.value
);
const refresh = () =>
  Promise.all([
    stats.reload(),
    trend.reload(),
    inventory.reload(),
    reviews.reload(),
    payments.reload(),
    recent.reload(),
  ]);
const cards = computed(() =>
  [
    {
      key: "dashboard.card.bookings",
      value: stats.data.value?.total ?? "—",
      icon: CalendarDays,
      show: can("booking.read"),
      error: stats.error.value,
    },
    {
      key: "dashboard.card.occupancy",
      value:
        inventory.data.value && inventory.data.value.totalRooms > 0
          ? `${inventory.data.value.occupancyRate}%`
          : "—",
      icon: BedDouble,
      show: can("room.read"),
      error: inventory.error.value,
    },
    {
      key: "metrics.publishedRating",
      value: reviews.data.value?.publishedCount
        ? `${reviews.data.value.averageRating.toFixed(1)}/10`
        : "—",
      icon: Star,
      show: can("review.read"),
      error: reviews.error.value,
    },
    {
      key: "metrics.transactions",
      value: payments.data.value?.totalTransactions ?? "—",
      icon: Wallet,
      show: can("payment.read"),
      error: payments.error.value,
    },
  ].filter((card) => card.show)
);
const points = computed(
  () =>
    trend.data.value?.points.map((point) => ({
      label: point.date,
      value: point.count,
    })) ?? []
);
const occupancySegments = computed(() => {
  const s = inventory.data.value;
  return s
    ? [
        {
          label: t("dashboard.chart.booked"),
          value: s.bookedRooms,
          color: "#0071c2",
        },
        {
          label: t("availability.heldLabel"),
          value: s.heldRooms,
          color: "#ffb700",
        },
        {
          label: t("dashboard.chart.available"),
          value: s.availableRooms,
          color: "#cbd5e1",
        },
      ]
    : [];
});
const statusRows = computed(() =>
  Object.entries(stats.data.value?.byStatus ?? {}).map(([status, value]) => ({
    status,
    value,
  }))
);
</script>
<template>
  <section class="space-y-6">
    <UiPageHeader
      :title="$t('dashboard.title')"
      :subtitle="auth.activeHotel?.name ?? $t('common.noHotelSelected')"
      ><template #actions
        ><el-button
          :loading="loading"
          :disabled="!auth.activeHotelId"
          @click="refresh"
          >{{ $t("common.refresh") }}</el-button
        ></template
      ></UiPageHeader
    >
    <UiEmptyState
      v-if="!auth.activeHotelId"
      :title="$t('dashboard.noHotelAssigned')"
    />
    <template v-else>
      <p class="text-xs text-muted">{{ $t("metrics.hotelScope") }}</p>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UiStatCard
          v-for="card in cards"
          :key="card.key"
          :label="$t(card.key)"
          :value="card.value"
          :hint="card.error ? $t('metrics.failed') : undefined"
          ><template #icon
            ><component
              :is="card.icon"
              :size="18"
              aria-hidden="true" /></template
        ></UiStatCard>
      </div>
      <div
        class="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
      >
        <UiSectionCard
          v-if="can('booking.read')"
          :title="$t('dashboard.chart.bookingsLast14Days')"
          :description="$t('metrics.bookingTrendScope')"
        >
          <el-alert
            v-if="trend.error.value"
            :title="$t('metrics.failed')"
            type="error"
            :closable="false"
          />
          <p v-else-if="trend.loading.value" role="status">
            {{ $t("common.loading") }}
          </p>
          <TrendChart
            v-else-if="points.some((point) => point.value > 0)"
            :points="points"
          />
          <UiEmptyState
            v-else
            :title="$t('dashboard.empty.noBookingsPeriod')"
          />
        </UiSectionCard>
        <UiSectionCard
          v-if="can('room.read')"
          :title="$t('dashboard.chart.occupancy')"
          :description="
            inventory.data.value
              ? `${inventory.data.value.startDate} → ${inventory.data.value.endDate} · ${$t('metrics.roomNights')}`
              : undefined
          "
        >
          <el-alert
            v-if="inventory.error.value"
            :title="$t('metrics.failed')"
            type="error"
            :closable="false"
          />
          <p v-else-if="inventory.loading.value" role="status">
            {{ $t("common.loading") }}
          </p>
          <DonutChart
            v-else-if="
              inventory.data.value && inventory.data.value.totalRooms > 0
            "
            :segments="occupancySegments"
            :center-value="`${inventory.data.value.occupancyRate}%`"
            :center-label="$t('dashboard.chart.occupied')"
          />
          <UiEmptyState v-else :title="$t('dashboard.empty.noOccupancy')" />
        </UiSectionCard>
      </div>
      <div
        class="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
      >
        <UiSectionCard
          v-if="can('booking.read')"
          :title="$t('dashboard.recentBookings')"
          :description="$t('metrics.recentScope')"
        >
          <el-alert
            v-if="recent.error.value"
            :title="$t('metrics.failed')"
            type="error"
            :closable="false"
          />
          <div v-else class="tn-table-region">
            <el-table
              v-loading="recent.loading.value"
              :data="recent.data.value?.data ?? []"
              row-key="id"
              ><el-table-column :label="$t('bookings.col.code')" min-width="160"
                ><template #default="{ row }"
                  ><NuxtLink :to="`/bookings/${row.id}`">{{
                    row.booking_code
                  }}</NuxtLink></template
                ></el-table-column
              ><el-table-column
                prop="check_in_date"
                :label="$t('bookings.col.checkIn')"
                min-width="130" /><el-table-column
                :label="$t('common.status')"
                min-width="150"
                ><template #default="{ row }"
                  ><BookingStatusTag
                    :status="row.status" /></template></el-table-column
            ></el-table>
          </div>
        </UiSectionCard>
        <UiSectionCard
          v-if="can('booking.read')"
          :title="$t('dashboard.chart.bookingsByStatus')"
        >
          <el-alert
            v-if="stats.error.value"
            :title="$t('metrics.failed')"
            type="error"
            :closable="false"
          />
          <ul v-else-if="statusRows.length" class="space-y-4">
            <li
              v-for="row in statusRows"
              :key="row.status"
              class="flex items-center justify-between gap-3"
            >
              <BookingStatusTag :status="row.status" /><span
                class="font-medium"
                >{{ row.value }}</span
              >
            </li>
          </ul>
          <UiEmptyState v-else :title="$t('dashboard.empty.noBookings')" />
        </UiSectionCard>
      </div>
      <p v-if="can('payment.read')" class="text-xs text-muted">
        {{ $t("metrics.currencyUnavailable") }}
      </p>
    </template>
  </section>
</template>
