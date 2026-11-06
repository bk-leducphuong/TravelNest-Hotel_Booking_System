<script setup lang="ts">
import { CalendarDays, Wallet, Star, ArrowUpRight } from "lucide-vue-next";
import { fetchBookingStats } from "~/services/api/bookings";
import { fetchPaymentSummary } from "~/services/api/payments";
import { fetchPayoutSummary } from "~/services/api/payouts";
import { fetchReviewSummary } from "~/services/api/reviews";
const props = withDefaults(
  defineProps<{
    kind: "bookings" | "payments" | "payouts" | "reviews";
    distribution?: boolean;
  }>(),
  { distribution: false }
);
const { t } = useI18n();
const permission =
  props.kind === "bookings"
    ? "booking.read"
    : props.kind === "reviews"
      ? "review.read"
      : "payment.read";
const { can } = usePermissions();
const icons = {
  bookings: CalendarDays,
  payments: Wallet,
  payouts: ArrowUpRight,
  reviews: Star,
};
const fallbackKeys = {
  bookings: [
    "metrics.bookings",
    "reservations.arrivals",
    "reservations.departures",
  ],
  payments: [
    "metrics.transactions",
    "metrics.completedTransactions",
    "metrics.refundedTransactions",
  ],
  payouts: ["metrics.payouts", "metrics.paidPayouts", "metrics.pendingPayouts"],
  reviews: ["metrics.publishedRating", "metrics.reviews", "metrics.unreplied"],
};
const palette = ["#003b95", "#0071c2", "#1d5fc2", "#ffb700", "#999999"];
const segments = (counts: Record<string, number>, prefix: string) =>
  Object.entries(counts)
    .filter(([, value]) => value > 0)
    .map(([status, value], index) => ({
      label: `${prefix}.${status}`,
      value,
      color: palette[index % palette.length]!,
    }));
const { data, loading, error, reload } = useHotelSummary(
  permission,
  async (hotelId) => {
    if (props.kind === "bookings") {
      const s = await fetchBookingStats(hotelId);
      return {
        cards: [
          { key: "metrics.bookings", value: s.total },
          {
            key: "reservations.arrivals",
            value: s.arrivalsToday,
            hint: "metrics.todayUtc",
          },
          {
            key: "reservations.departures",
            value: s.departuresToday,
            hint: "metrics.todayUtc",
          },
        ],
        segments: segments(s.byStatus, "bookings.status"),
      };
    }
    if (props.kind === "reviews") {
      const s = await fetchReviewSummary(hotelId);
      return {
        cards: [
          {
            key: "metrics.publishedRating",
            value: s.publishedCount ? `${s.averageRating.toFixed(1)}/10` : "—",
          },
          { key: "metrics.reviews", value: s.totalReviews },
          { key: "metrics.unreplied", value: Math.max(0, s.unrepliedCount) },
        ],
        segments: [],
      };
    }
    if (props.kind === "payments") {
      const s = await fetchPaymentSummary(hotelId);
      return {
        cards: [
          { key: "metrics.transactions", value: s.totalTransactions },
          {
            key: "metrics.completedTransactions",
            value: s.byStatus.completed ?? 0,
          },
          {
            key: "metrics.refundedTransactions",
            value:
              (s.byStatus.refunded ?? 0) + (s.byStatus.partially_refunded ?? 0),
          },
        ],
        segments: segments(s.byStatus, "payments.transactionStatus"),
      };
    }
    const s = await fetchPayoutSummary(hotelId);
    return {
      cards: [
        {
          key: "metrics.payouts",
          value: Object.values(s.byStatus).reduce(
            (sum, row) => sum + row.count,
            0
          ),
        },
        { key: "metrics.paidPayouts", value: s.byStatus.paid?.count ?? 0 },
        {
          key: "metrics.pendingPayouts",
          value: s.byStatus.pending?.count ?? 0,
        },
      ],
      segments: segments(
        Object.fromEntries(
          Object.entries(s.byStatus).map(([key, row]) => [key, row.count])
        ),
        "payouts.status"
      ),
    };
  }
);
const fallback = computed(() =>
  fallbackKeys[props.kind].map((key) => ({ key, value: "—" }))
);
const localizedSegments = computed(
  () =>
    data.value?.segments.map((segment) => ({
      ...segment,
      label: t(segment.label),
    })) ?? []
);
defineExpose({ reload });
</script>
<template>
  <div v-if="can(permission)" class="space-y-3" :aria-busy="loading">
    <p class="text-xs text-muted">{{ $t("metrics.hotelScope") }}</p>
    <div
      v-if="error"
      role="alert"
      class="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4"
    >
      <span class="text-sm text-red-800">{{ $t("metrics.failed") }}</span
      ><el-button size="small" @click="reload">{{
        $t("common.refresh")
      }}</el-button>
    </div>
    <div class="grid gap-4 sm:grid-cols-3">
      <UiStatCard
        v-for="(card, index) in data?.cards ?? fallback"
        :key="index"
        :label="$t(card.key)"
        :value="loading ? '…' : card.value"
        :hint="'hint' in card && card.hint ? t(String(card.hint)) : undefined"
        ><template #icon
          ><component
            :is="icons[kind]"
            :size="18"
            aria-hidden="true" /></template
      ></UiStatCard>
    </div>
    <UiSectionCard
      v-if="distribution && data?.segments.length"
      :title="$t('metrics.statusDistribution')"
      :description="$t('metrics.countsOnly')"
      ><DonutChart :segments="localizedSegments"
    /></UiSectionCard>
    <p
      v-if="kind === 'payments' || kind === 'payouts'"
      class="text-xs text-muted"
    >
      {{ $t("metrics.currencyUnavailable") }}
    </p>
  </div>
</template>
