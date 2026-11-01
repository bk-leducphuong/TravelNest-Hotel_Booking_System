<script setup lang="ts">
import { fetchFinanceOverview } from "~/services/api/finance";
const { date, money, number } = usePlatformFormat();
const { data, loading, error, load } = usePlatformResource(
  "platform.finance.read",
  () => "finance-overview",
  fetchFinanceOverview,
  true
);
const hasSnapshot = computed(() =>
  Boolean(
    data.value &&
    !data.value.stale &&
    data.value.generatedAt &&
    Number.isFinite(Date.parse(data.value.generatedAt))
  )
);
const sections = computed(() =>
  data.value
    ? [
        { key: "gross", rows: data.value.gross },
        { key: "refunds", rows: data.value.refunds },
        { key: "payoutsPaid", rows: data.value.payoutsPaid },
        { key: "payoutsPending", rows: data.value.payoutsPending },
      ]
    : []
);
</script>
<template>
  <div class="space-y-6">
    <UiPageHeader
      :title="$t('nav.financeOverview')"
      :subtitle="$t('finance.description')"
      ><template #actions
        ><el-button :loading="loading" @click="load">{{
          $t("common.refresh")
        }}</el-button></template
      ></UiPageHeader
    >
    <FinanceNav />
    <div class="space-y-1 text-xs text-muted">
      <p>{{ $t("finance.summaryScope") }}</p>
      <p>{{ $t("overview.refreshHint") }}</p>
      <p v-if="hasSnapshot" role="status">
        {{ $t("overview.generated", { date: date(data?.generatedAt) }) }}
      </p>
    </div>
    <UiReadState
      :loading="loading && !hasSnapshot"
      :error="error"
      @retry="load"
    />
    <p v-if="error && hasSnapshot" role="status" class="text-sm text-muted">
      {{ $t("common.retained") }}
    </p>
    <UiSectionCard
      v-if="!loading && !error && !hasSnapshot"
      :title="$t('overview.missingTitle')"
      :description="$t('overview.missingDescription')"
    />
    <div
      v-if="hasSnapshot"
      class="grid gap-6 lg:grid-cols-2"
      :aria-busy="loading"
    >
      <UiSectionCard
        v-for="section in sections"
        :key="section.key"
        :title="$t(`finance.${section.key}`)"
      >
        <dl v-if="section.rows.length" class="space-y-5">
          <div
            v-for="row in section.rows"
            :key="row.currency"
            class="flex flex-wrap items-center justify-between gap-3"
          >
            <dt class="text-sm text-muted">{{ row.currency }}</dt>
            <dd class="text-right">
              <p class="text-xl font-medium tabular-nums">
                {{ money(row.amount, row.currency) }}
              </p>
              <p class="mt-1 text-xs text-muted">
                {{
                  $t(row.count === 1 ? "finance.countOne" : "finance.count", {
                    count: number(row.count),
                  })
                }}
              </p>
            </dd>
          </div>
        </dl>
        <p v-else class="text-sm text-muted">
          {{ $t("finance.emptyCurrency") }}
        </p>
      </UiSectionCard>
    </div>
  </div>
</template>
