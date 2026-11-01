<script setup lang="ts">
import { statusTagType } from "~/utils/format";
import {
  Building2,
  Users,
  CalendarCheck,
  ArrowRight,
  RefreshCw,
} from "lucide-vue-next";
import { fetchOverview, type PlatformOverview } from "~/services/api/overview";
import { ApiError } from "~/services/http";
const { locale, t, te } = useI18n();
const auth = useAuthStore();
const { items } = usePlatformNavigation();
const { can } = usePermissions();
const beginRequest = useRequestVersion();
const loading = ref(true);
const failed = ref(false);
const overview = ref<PlatformOverview | null>(null);
const load = async () => {
  const isCurrent = beginRequest();
  if (!can("platform.overview.read") || !auth.isAuthenticated) {
    overview.value = null;
    loading.value = false;
    return;
  }
  loading.value = true;
  failed.value = false;
  try {
    const result = await fetchOverview();
    if (isCurrent()) overview.value = result;
  } catch (error) {
    if (!isCurrent()) return;
    if (
      error instanceof ApiError &&
      (error.status === 401 || error.status === 403)
    ) {
      overview.value = null;
      await navigateTo(error.status === 403 ? "/403" : "/login");
      return;
    }
    failed.value = true;
  } finally {
    if (isCurrent()) loading.value = false;
  }
};
// A session/permission change invalidates in-flight responses and retained data.
watch(
  () => [auth.user?.id, auth.isAuthenticated, can("platform.overview.read")],
  () => {
    overview.value = null;
    void load();
    if (!auth.isAuthenticated) void navigateTo("/login");
    else if (!can("platform.overview.read")) void navigateTo("/403");
  }
);
onMounted(load);
const hasSnapshot = computed(() =>
  Boolean(
    overview.value &&
    !overview.value.stale &&
    overview.value.generatedAt &&
    Number.isFinite(Date.parse(overview.value.generatedAt))
  )
);
const number = (value: number) =>
  new Intl.NumberFormat(locale.value).format(value);
const generatedAt = computed(() =>
  hasSnapshot.value
    ? new Intl.DateTimeFormat(locale.value, {
        dateStyle: "medium",
        timeStyle: "long",
        timeZone: "UTC",
      }).format(new Date(overview.value!.generatedAt!))
    : ""
);
const cards = computed(() =>
  overview.value
    ? [
        {
          key: "hotels",
          label: t("overview.hotels"),
          value: number(overview.value.hotels.total),
          hint: t("overview.active", {
            count: number(overview.value.hotels.byStatus.active ?? 0),
          }),
          icon: Building2,
        },
        {
          key: "users",
          label: t("overview.users"),
          value: number(overview.value.users.total),
          hint: t("overview.active", {
            count: number(overview.value.users.byStatus.active ?? 0),
          }),
          icon: Users,
        },
        {
          key: "bookings",
          label: t("overview.bookings"),
          value: number(overview.value.bookings.total),
          hint: t("overview.allTime"),
          icon: CalendarCheck,
        },
      ]
    : []
);
const distributions = computed(() => [
  {
    key: "hotels",
    title: t("overview.hotelStatuses"),
    rows: Object.entries(overview.value?.hotels.byStatus ?? {}),
  },
  {
    key: "users",
    title: t("overview.userStatuses"),
    rows: Object.entries(overview.value?.users.byStatus ?? {}),
  },
]);
const shortcuts = computed(() => items.value.filter((item) => item.to !== "/"));
const label = (status: string) =>
  te(`status.${status}`) ? t(`status.${status}`) : status.replace(/_/g, " ");
</script>

<template>
  <div class="space-y-6">
    <UiPageHeader
      :title="$t('overview.title')"
      :subtitle="$t('overview.description')"
    >
      <template #actions
        ><el-button :loading="loading" @click="load"
          ><RefreshCw
            v-if="!loading"
            :size="16"
            class="mr-2"
            aria-hidden="true"
          />{{ $t("common.refresh") }}</el-button
        ></template
      >
    </UiPageHeader>
    <div class="space-y-1 text-xs text-muted">
      <p>{{ $t("overview.scope") }}</p>
      <p>{{ $t("overview.refreshHint") }}</p>
      <p v-if="hasSnapshot" role="status">
        {{ $t("overview.generated", { date: generatedAt }) }}
      </p>
    </div>
    <div
      v-if="failed"
      role="alert"
      class="rounded-panel border border-red-200 bg-white p-5"
    >
      <h2 class="font-medium">{{ $t("overview.errorTitle") }}</h2>
      <p class="my-3 text-sm text-muted">
        {{
          $t(
            hasSnapshot ? "overview.refreshError" : "overview.errorDescription"
          )
        }}
      </p>
      <el-button :loading="loading" @click="load">{{
        $t("common.retry")
      }}</el-button>
    </div>
    <div :aria-busy="loading" class="space-y-6">
      <div v-if="loading && !hasSnapshot" role="status" class="tn-section">
        <p class="mb-5 text-sm text-muted">{{ $t("common.loading") }}</p>
        <el-skeleton :rows="4" animated aria-hidden="true" />
      </div>
      <UiSectionCard
        v-else-if="!failed && !hasSnapshot"
        :title="$t('overview.missingTitle')"
        :description="$t('overview.missingDescription')"
      />
      <template v-if="hasSnapshot">
        <div class="grid gap-4 sm:grid-cols-3">
          <UiStatCard
            v-for="card in cards"
            :key="card.key"
            :label="card.label"
            :value="card.value"
            :hint="card.hint"
          >
            <template #icon
              ><component :is="card.icon" :size="20" aria-hidden="true"
            /></template>
          </UiStatCard>
        </div>
        <div class="grid gap-6 lg:grid-cols-2">
          <UiSectionCard
            v-for="section in distributions"
            :key="section.key"
            :title="section.title"
          >
            <dl v-if="section.rows.length" class="space-y-4">
              <div
                v-for="[status, count] in section.rows"
                :key="status"
                class="flex items-center justify-between gap-4"
              >
                <dt>
                  <UiStatusPill :tone="statusTagType(status)">{{
                    label(status)
                  }}</UiStatusPill>
                </dt>
                <dd class="font-medium tabular-nums">{{ number(count) }}</dd>
              </div>
            </dl>
            <p v-else class="text-sm text-muted">
              {{ $t("overview.noStatuses") }}
            </p>
          </UiSectionCard>
        </div>
      </template>
    </div>
    <UiSectionCard
      v-if="shortcuts.length"
      :title="$t('overview.shortcuts')"
      :description="$t('overview.shortcutsDescription')"
    >
      <div class="grid gap-3 sm:grid-cols-2">
        <NuxtLink
          v-for="item in shortcuts"
          :key="item.to"
          :to="item.to"
          class="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-4 text-sm font-medium text-brand hover:bg-soft"
        >
          {{ $t("overview.view", { page: $t(item.labelKey) })
          }}<ArrowRight :size="18" aria-hidden="true" />
        </NuxtLink>
      </div>
    </UiSectionCard>
  </div>
</template>
