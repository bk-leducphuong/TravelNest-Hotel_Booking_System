<script setup lang="ts">
import { fetchBookingStats, type BookingStats } from "~/services/api/bookings";
import { fetchPaymentSummary, type PaymentSummary } from "~/services/api/payments";
import { fetchPayoutSummary, type PayoutSummary } from "~/services/api/payouts";
import { fetchOccupancy, type OccupancySummary } from "~/services/api/inventory";
import { fetchReviewSummary, type ReviewSummary } from "~/services/api/reviews";

const auth = useAuthStore();
const { can } = usePermissions();

const loading = ref(false);
const bookingStats = ref<BookingStats | null>(null);
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

const statusLabel = (status: string) =>
  status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const cards = computed(() => [
  {
    label: "Gross revenue",
    value: money(paymentSummary.value?.grossAmount),
    hint: `${paymentSummary.value?.totalTransactions ?? 0} transactions`,
    show: can("payment.read"),
  },
  {
    label: "Net revenue",
    value: money(paymentSummary.value?.netAmount),
    hint: `${money(paymentSummary.value?.refundedAmount)} refunded`,
    show: can("payment.read"),
  },
  {
    label: "Occupancy",
    value: `${occupancy.value?.occupancyRate ?? 0}%`,
    hint: `${occupancy.value?.bookedRooms ?? 0}/${occupancy.value?.totalRooms ?? 0} room-nights`,
    show: can("room.read"),
  },
  {
    label: "Bookings",
    value: String(bookingStats.value?.total ?? 0),
    hint: `${bookingStats.value?.arrivalsToday ?? 0} arrivals today`,
    show: can("booking.read"),
  },
  {
    label: "Average rating",
    value: (reviewSummary.value?.averageRating ?? 0).toFixed(1),
    hint: `${reviewSummary.value?.publishedCount ?? 0} published reviews`,
    show: can("review.read"),
  },
  {
    label: "Pending payouts",
    value: money(payoutSummary.value?.pendingAmount),
    hint: payoutSummary.value?.payoutReady ? "Payouts ready" : "Onboarding incomplete",
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

const unwind = (promise: Promise<unknown> | null) => promise ?? Promise.resolve();

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
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h2>
        <p class="mt-1 text-sm text-slate-500">
          {{ auth.activeHotel?.name || "No hotel selected" }}
          <span v-if="occupancy">· {{ occupancy.startDate }} → {{ occupancy.endDate }}</span>
        </p>
      </div>
      <el-button :loading="loading" :disabled="!auth.activeHotelId" @click="load">
        Refresh
      </el-button>
    </div>

    <el-empty
      v-if="!auth.activeHotelId"
      description="No hotel is assigned to your account. Ask an administrator to add you to a hotel."
    />

    <template v-else>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <el-card
          v-for="card in visibleCards"
          :key="card.label"
          v-loading="loading"
          class="shadow-sm"
        >
          <p class="text-xs font-medium uppercase tracking-wide text-slate-400">{{ card.label }}</p>
          <p class="mt-1 text-2xl font-semibold text-slate-900">{{ card.value }}</p>
          <p class="mt-1 text-xs text-slate-500">{{ card.hint }}</p>
        </el-card>
      </div>

      <el-card v-if="can('booking.read')" v-loading="loading" class="shadow-sm">
        <template #header>
          <span class="font-medium">Bookings by status</span>
        </template>
        <el-empty
          v-if="bookingStatusRows.length === 0"
          description="No bookings yet"
          :image-size="60"
        />
        <ul v-else class="space-y-3">
          <li
            v-for="row in bookingStatusRows"
            :key="row.status"
            class="flex items-center justify-between gap-4"
          >
            <span class="w-40 text-sm text-slate-600">{{ statusLabel(row.status) }}</span>
            <el-progress
              :percentage="Math.round((row.count / Math.max(bookingStats?.total ?? 1, 1)) * 100)"
              :stroke-width="10"
              class="flex-1"
            />
            <span class="w-10 text-right text-sm font-medium text-slate-900">{{ row.count }}</span>
          </li>
        </ul>
      </el-card>
    </template>
  </section>
</template>
