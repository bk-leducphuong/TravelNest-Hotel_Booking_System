<script setup lang="ts">
import {
  fetchBookingStats,
  fetchBookingTrend,
  type BookingStats,
  type BookingTrend,
} from "~/services/api/bookings";
import {
  fetchPaymentSummary,
  type PaymentSummary,
} from "~/services/api/payments";
import { fetchPayoutSummary, type PayoutSummary } from "~/services/api/payouts";
import {
  fetchOccupancy,
  type OccupancySummary,
} from "~/services/api/inventory";
import { fetchReviewSummary, type ReviewSummary } from "~/services/api/reviews";

const auth = useAuthStore();
const { can } = usePermissions();
const { t } = useI18n();

const loading = ref(false);
const bookingStats = ref<BookingStats | null>(null);
const bookingTrend = ref<BookingTrend | null>(null);
const paymentSummary = ref<PaymentSummary | null>(null);
const payoutSummary = ref<PayoutSummary | null>(null);
const occupancy = ref<OccupancySummary | null>(null);
const reviewSummary = ref<ReviewSummary | null>(null);

const money = (value?: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const statusLabel = (status: string) => t(`bookings.status.${status}`);

const cards = computed(() => [
  {
    label: t("dashboard.card.grossRevenue"),
    value: money(paymentSummary.value?.grossAmount),
    hint: t("dashboard.hint.transactions", {
      count: paymentSummary.value?.totalTransactions ?? 0,
    }),
    show: can("payment.read"),
  },
  {
    label: t("dashboard.card.netRevenue"),
    value: money(paymentSummary.value?.netAmount),
    hint: t("dashboard.hint.refunded", {
      amount: money(paymentSummary.value?.refundedAmount),
    }),
    show: can("payment.read"),
  },
  {
    label: t("dashboard.card.occupancy"),
    value: `${occupancy.value?.occupancyRate ?? 0}%`,
    hint: t("dashboard.hint.roomNights", {
      booked: occupancy.value?.bookedRooms ?? 0,
      total: occupancy.value?.totalRooms ?? 0,
    }),
    show: can("room.read"),
  },
  {
    label: t("dashboard.card.bookings"),
    value: String(bookingStats.value?.total ?? 0),
    hint: t("dashboard.hint.arrivalsToday", {
      count: bookingStats.value?.arrivalsToday ?? 0,
    }),
    show: can("booking.read"),
  },
  {
    label: t("dashboard.card.averageRating"),
    value: (reviewSummary.value?.averageRating ?? 0).toFixed(1),
    hint: t("dashboard.hint.publishedReviews", {
      count: reviewSummary.value?.publishedCount ?? 0,
    }),
    show: can("review.read"),
  },
  {
    label: t("dashboard.card.pendingPayouts"),
    value: money(payoutSummary.value?.pendingAmount),
    hint: payoutSummary.value?.payoutReady
      ? t("dashboard.hint.payoutsReady")
      : t("dashboard.hint.onboardingIncomplete"),
    show: can("payment.read"),
  },
]);

const visibleCards = computed(() => cards.value.filter((card) => card.show));

const bookingStatusRows = computed(() => {
  const byStatus = bookingStats.value?.byStatus ?? {};
  return Object.entries(byStatus)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({ status, count }));
});

const trendPoints = computed(
  () =>
    bookingTrend.value?.points.map((point) => ({
      label: point.date.slice(5),
      value: point.count,
    })) ?? []
);

const occupancySegments = computed(() => {
  const booked = occupancy.value?.bookedRooms ?? 0;
  const total = occupancy.value?.totalRooms ?? 0;
  return [
    { label: t("dashboard.chart.booked"), value: booked, color: "#0071c2" },
    {
      label: t("dashboard.chart.available"),
      value: Math.max(total - booked, 0),
      color: "#cbd5e1",
    },
  ];
});

const revenueBars = computed(() => [
  {
    label: t("dashboard.chart.gross"),
    value: paymentSummary.value?.grossAmount ?? 0,
    color: "#0071c2",
  },
  {
    label: t("dashboard.chart.net"),
    value: paymentSummary.value?.netAmount ?? 0,
    color: "#003b95",
  },
  {
    label: t("dashboard.chart.refunded"),
    value: paymentSummary.value?.refundedAmount ?? 0,
    color: "#b3261e",
  },
]);

const unwind = (promise: Promise<unknown> | null) =>
  promise ?? Promise.resolve();

const load = async () => {
  if (!auth.activeHotelId) {
    return;
  }
  const hotelId = auth.activeHotelId;
  loading.value = true;

  await Promise.all([
    can("booking.read")
      ? fetchBookingStats(hotelId)
          .then((data) => (bookingStats.value = data))
          .catch(() => (bookingStats.value = null))
      : unwind(null),
    can("booking.read")
      ? fetchBookingTrend(hotelId, 14)
          .then((data) => (bookingTrend.value = data))
          .catch(() => (bookingTrend.value = null))
      : unwind(null),
    can("payment.read")
      ? fetchPaymentSummary(hotelId)
          .then((data) => (paymentSummary.value = data))
          .catch(() => (paymentSummary.value = null))
      : unwind(null),
    can("payment.read")
      ? fetchPayoutSummary(hotelId)
          .then((data) => (payoutSummary.value = data))
          .catch(() => (payoutSummary.value = null))
      : unwind(null),
    can("room.read")
      ? fetchOccupancy(hotelId)
          .then((data) => (occupancy.value = data))
          .catch(() => (occupancy.value = null))
      : unwind(null),
    can("review.read")
      ? fetchReviewSummary(hotelId)
          .then((data) => (reviewSummary.value = data))
          .catch(() => (reviewSummary.value = null))
      : unwind(null),
  ]);

  loading.value = false;
};

watch(() => auth.activeHotelId, load, { immediate: true });
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
          {{ $t("dashboard.title") }}
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          {{ auth.activeHotel?.name || $t("dashboard.noHotelSelected") }}
          <span v-if="occupancy"
            >· {{ occupancy.startDate }} → {{ occupancy.endDate }}</span
          >
        </p>
      </div>
      <el-button
        :loading="loading"
        :disabled="!auth.activeHotelId"
        @click="load"
      >
        {{ $t("common.refresh") }}
      </el-button>
    </div>

    <el-empty
      v-if="!auth.activeHotelId"
      :description="$t('dashboard.noHotelAssigned')"
    />

    <template v-else>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <el-card
          v-for="card in visibleCards"
          :key="card.label"
          v-loading="loading"
          class="shadow-sm"
        >
          <p class="text-xs font-medium uppercase tracking-wide text-slate-400">
            {{ card.label }}
          </p>
          <p class="mt-1 text-2xl font-semibold text-slate-900">
            {{ card.value }}
          </p>
          <p class="mt-1 text-xs text-slate-500">{{ card.hint }}</p>
        </el-card>
      </div>

      <el-card v-if="can('booking.read')" v-loading="loading" class="shadow-sm">
        <template #header>
          <span class="font-medium">{{
            $t("dashboard.chart.bookingsLast14Days")
          }}</span>
        </template>
        <el-empty
          v-if="
            !bookingTrend ||
            bookingTrend.points.every((point) => point.count === 0)
          "
          :description="$t('dashboard.empty.noBookingsPeriod')"
          :image-size="60"
        />
        <TrendChart v-else :points="trendPoints" />
      </el-card>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <el-card v-if="can('room.read')" v-loading="loading" class="shadow-sm">
          <template #header>
            <span class="font-medium">{{
              $t("dashboard.chart.occupancy")
            }}</span>
          </template>
          <el-empty
            v-if="!occupancy"
            :description="$t('dashboard.empty.noOccupancy')"
            :image-size="60"
          />
          <DonutChart
            v-else
            :segments="occupancySegments"
            :center-value="`${occupancy.occupancyRate}%`"
            :center-label="$t('dashboard.chart.occupied')"
          />
        </el-card>

        <el-card
          v-if="can('payment.read')"
          v-loading="loading"
          class="shadow-sm"
        >
          <template #header>
            <span class="font-medium">{{ $t("dashboard.chart.revenue") }}</span>
          </template>
          <el-empty
            v-if="!paymentSummary"
            :description="$t('dashboard.empty.noPayment')"
            :image-size="60"
          />
          <BarChart v-else :bars="revenueBars" :value-formatter="money" />
        </el-card>
      </div>

      <el-card v-if="can('booking.read')" v-loading="loading" class="shadow-sm">
        <template #header>
          <span class="font-medium">{{
            $t("dashboard.chart.bookingsByStatus")
          }}</span>
        </template>
        <el-empty
          v-if="bookingStatusRows.length === 0"
          :description="$t('dashboard.empty.noBookings')"
          :image-size="60"
        />
        <ul v-else class="space-y-3">
          <li
            v-for="row in bookingStatusRows"
            :key="row.status"
            class="flex items-center justify-between gap-4"
          >
            <span class="w-40 text-sm text-slate-600">{{
              statusLabel(row.status)
            }}</span>
            <el-progress
              :percentage="
                Math.round(
                  (row.count / Math.max(bookingStats?.total ?? 1, 1)) * 100
                )
              "
              :stroke-width="10"
              class="flex-1"
            />
            <span class="w-10 text-right text-sm font-medium text-slate-900">{{
              row.count
            }}</span>
          </li>
        </ul>
      </el-card>
    </template>
  </section>
</template>
