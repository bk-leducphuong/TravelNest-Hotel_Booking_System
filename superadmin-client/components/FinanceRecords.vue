<script setup lang="ts">
import {
  fetchPayments,
  fetchRefunds,
  fetchPayouts,
  fetchLedger,
  type PaymentRow,
  type RefundRow,
  type PayoutRow,
  type LedgerRow,
} from "~/services/api/finance";
import { financeFilters } from "~/utils/list-config";
import { statusTagType } from "~/utils/format";
import type { RecordField } from "~/components/ui/RecordDrawer.vue";
type FinanceRow = PaymentRow | RefundRow | PayoutRow | LedgerRow;
const props = defineProps<{
  kind: "payments" | "refunds" | "payouts" | "ledger";
}>();
const { t } = useI18n();
const { can } = usePermissions();
const route = useRoute();
const { date, money, label } = usePlatformFormat();
const fields = financeFilters(props.kind);
const fetcher = {
  payments: fetchPayments,
  refunds: fetchRefunds,
  payouts: fetchPayouts,
  ledger: fetchLedger,
}[props.kind];
const {
  rows,
  total,
  loading,
  error,
  validation,
  draft,
  parsed,
  ready,
  filtered,
  pageCount,
  apply,
  clear,
  load,
  paginate,
} = usePagedList<FinanceRow>("platform.finance.read", fields, (params) =>
  fetcher(params)
);
const selected = shallowRef<FinanceRow | null>(null);
watch([() => route.fullPath, loading, rows], () => {
  selected.value = null;
});
const displayRows = computed(() =>
  rows.value.map((row) => ({
    row,
    id: row.id,
    hotel: row.hotel,
    amount: money(row.amount, row.currency),
    date: date(
      "postedAt" in row
        ? row.postedAt
        : "requestedAt" in row
          ? row.requestedAt
          : row.createdAt
    ),
    status: "status" in row ? row.status : row.direction,
    party: "buyer" in row ? row.buyer : "owner" in row ? row.owner : null,
    event: "eventType" in row ? label("events", row.eventType) : null,
    account: "account" in row ? row.account?.name : null,
  }))
);
const recordFields = computed<RecordField[]>(() => {
  const row = selected.value;
  if (!row) return [];
  const field = (
    key: string,
    value: RecordField["value"],
    copy = false,
    to?: string
  ): RecordField => ({ label: t(`fields.${key}`), value, copy, to });
  const result: RecordField[] = [
    field("id", row.id, true),
    field("amount", money(row.amount, row.currency)),
    field("currency", row.currency),
    field(
      "hotel",
      row.hotel?.name ?? row.hotel?.id,
      false,
      row.hotel && can("platform.hotel.read")
        ? `/hotels/${row.hotel.id}`
        : undefined
    ),
  ];
  if (row.hotel) result.push(field("hotelId", row.hotel.id, true));
  if ("status" in row)
    result.push(field("status", label("status", row.status)));
  if ("buyer" in row && row.buyer)
    result.push(
      field(
        "buyer",
        row.buyer.email,
        false,
        can("platform.user.read") ? `/users/${row.buyer.id}` : undefined
      )
    );
  if ("owner" in row && row.owner)
    result.push(
      field(
        "owner",
        row.owner.email,
        false,
        can("platform.user.read") ? `/users/${row.owner.id}` : undefined
      )
    );
  if ("bookingId" in row) result.push(field("bookingId", row.bookingId, true));
  if ("createdAt" in row) result.push(field("created", date(row.createdAt)));
  if ("method" in row)
    result.push(
      field("method", label("methods", row.method)),
      field("completed", date(row.completedAt))
    );
  if ("eligibility" in row)
    result.push(
      field("transactionId", row.transactionId, true),
      field("reason", label("refundReasons", row.reason)),
      field("eligibility", label("eligibility", row.eligibility)),
      field("requested", date(row.requestedAt)),
      field("processed", date(row.processedAt))
    );
  if ("platformFeeAmount" in row)
    result.push(
      field("fee", money(row.platformFeeAmount, row.currency)),
      field("periodStart", date(row.periodStart)),
      field("periodEnd", date(row.periodEnd)),
      field("paid", date(row.paidAt))
    );
  if ("refs" in row) {
    result.push(
      field("posted", date(row.postedAt)),
      field("direction", label("directions", row.direction)),
      field("event", label("events", row.eventType)),
      field("account", row.account?.name),
      field("accountType", label("accountTypes", row.account?.accountType)),
      field("description", row.description)
    );
    for (const [key, value] of Object.entries(row.refs))
      result.push(field(key, value, true));
  }
  return result;
});
</script>
<template>
  <div class="space-y-6">
    <UiPageHeader
      :title="$t(`nav.${kind}`)"
      :subtitle="$t(`finance.${kind}Description`)"
      ><template #actions
        ><el-button :loading="loading" @click="load">{{
          $t("common.refresh")
        }}</el-button></template
      ></UiPageHeader
    >
    <FinanceNav />
    <p class="text-xs text-muted">
      {{
        $t(kind === "ledger" ? "filters.postedDates" : "filters.creationDates")
      }}
      {{ $t("filters.uuidHint") }}
    </p>
    <p class="text-xs text-muted">
      {{
        $t(
          can("platform.user.pii_read")
            ? "directory.piiVisible"
            : "directory.piiMasked"
        )
      }}
    </p>
    <UiListFilters
      :fields="fields"
      :values="draft"
      :error="validation"
      @update="(key, value) => (draft[key] = value)"
      @apply="apply"
      @clear="clear"
    />
    <UiReadState
      :loading="loading"
      :error="error"
      :empty="ready && !rows.length && parsed.page <= pageCount"
      :filtered="filtered"
      @retry="load"
    />
    <template v-if="ready && !loading && !error">
      <div v-if="rows.length" class="tn-section">
        <div
          class="tn-table-region"
          tabindex="0"
          role="region"
          :aria-label="$t('common.tableScroll')"
        >
          <table>
            <caption class="sr-only">
              {{
                $t(`nav.${kind}`)
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  {{
                    $t(
                      kind === "ledger"
                        ? "fields.posted"
                        : kind === "refunds"
                          ? "fields.requested"
                          : "fields.created"
                    )
                  }}
                </th>
                <th scope="col">{{ $t("fields.hotel") }}</th>
                <th scope="col">
                  {{
                    $t(
                      kind === "ledger"
                        ? "fields.account"
                        : kind === "payouts"
                          ? "fields.owner"
                          : "fields.buyer"
                    )
                  }}
                </th>
                <th scope="col">{{ $t("fields.amount") }}</th>
                <th scope="col">
                  {{
                    $t(kind === "ledger" ? "fields.direction" : "fields.status")
                  }}
                </th>
                <th v-if="kind === 'ledger'" scope="col">
                  {{ $t("fields.event") }}
                </th>
                <th scope="col">{{ $t("fields.inspect") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in displayRows" :key="item.id">
                <td>{{ item.date }}</td>
                <td>
                  <NuxtLink
                    v-if="item.hotel && can('platform.hotel.read')"
                    :to="`/hotels/${item.hotel.id}`"
                    >{{ item.hotel.name || item.hotel.id }}</NuxtLink
                  ><span v-else>{{ item.hotel?.name || "—" }}</span>
                </td>
                <td v-if="kind === 'ledger'">{{ item.account || "—" }}</td>
                <td v-else>
                  <NuxtLink
                    v-if="item.party && can('platform.user.read')"
                    :to="`/users/${item.party.id}`"
                    >{{ item.party.email }}</NuxtLink
                  ><span v-else>{{ item.party?.email || "—" }}</span>
                </td>
                <td class="whitespace-nowrap font-medium tabular-nums">
                  {{ item.amount }}
                </td>
                <td>
                  <UiStatusPill :tone="statusTagType(item.status)">{{
                    label(
                      kind === "ledger" ? "directions" : "status",
                      item.status
                    )
                  }}</UiStatusPill>
                </td>
                <td v-if="kind === 'ledger'">{{ item.event }}</td>
                <td>
                  <button
                    type="button"
                    class="text-brand underline underline-offset-4"
                    :aria-label="$t('common.inspect', { id: item.id })"
                    @click="selected = item.row"
                  >
                    {{ $t("common.view") }}
                  </button>
                  <p class="mt-1 font-mono text-xs text-muted">{{ item.id }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div
        v-else-if="parsed.page > pageCount"
        class="tn-section space-y-3"
        role="status"
      >
        <p>{{ $t("common.outOfRange") }}</p>
        <el-button @click="paginate(pageCount)">{{
          $t("common.lastPage")
        }}</el-button>
      </div>
      <UiListPagination
        :page="parsed.page"
        :pages="pageCount"
        :limit="parsed.limit"
        :total="total"
        @change="paginate"
      />
    </template>
    <UiRecordDrawer
      :open="Boolean(selected)"
      :title="$t('finance.recordTitle')"
      :fields="recordFields"
      :description="$t('finance.recordHint')"
      @close="selected = null"
    />
  </div>
</template>
