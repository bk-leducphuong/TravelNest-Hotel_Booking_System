<script setup lang="ts">
import { Building2 } from "lucide-vue-next";
import { fetchHotels, type HotelSummary } from "~/services/api/catalog";

const { can } = usePermissions();
const auth = useAuthStore();
const requests = useRequestVersion();
const error = ref("");

const loading = ref(false);
const hotels = ref<HotelSummary[]>([]);
const total = ref(0);

const filters = reactive({
  search: "",
  page: 1,
  limit: 20,
});

const load = async () => {
  const current = requests.begin();
  hotels.value = [];
  total.value = 0;
  error.value = "";
  loading.value = false;
  if (!can("hotel.read")) return;
  loading.value = true;
  try {
    // The admin catalog list is already scoped server-side: platform staff see
    // all hotels, everyone else only the hotels they belong to.
    const result = await fetchHotels({
      search: filters.search || undefined,
      page: filters.page,
      limit: filters.limit,
    });
    if (!current()) return;
    hotels.value = result.data;
    total.value = result.meta.total;
  } catch (failure) {
    if (current()) error.value = (failure as Error).message;
  } finally {
    if (current()) loading.value = false;
  }
};

const applySearch = () => {
  filters.page = 1;
  load();
};

const onPageChange = (page: number) => {
  filters.page = page;
  load();
};

watch([() => auth.activeHotelId, () => can("hotel.read")], load, {
  immediate: true,
});
</script>

<template>
  <section class="space-y-6">
    <UiPageHeader
      :title="$t('properties.title')"
      :subtitle="$t('properties.subtitle')"
    />
    <UiEmptyState v-if="!can('hotel.read')" :title="$t('editor.forbidden')" />
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
      show-icon
    />

    <UiFilterBar>
      <div class="flex flex-wrap items-end gap-3">
        <el-input
          v-model="filters.search"
          :aria-label="$t('properties.searchPlaceholder')"
          :placeholder="$t('properties.searchPlaceholder')"
          clearable
          class="w-72"
          @keyup.enter="applySearch"
          @clear="applySearch"
        />
        <el-button type="primary" @click="applySearch">{{
          $t("common.search")
        }}</el-button>
      </div>
    </UiFilterBar>

    <UiSectionCard v-loading="loading">
      <el-empty
        v-if="!loading && hotels.length === 0"
        :description="$t('properties.emptyManage')"
      />

      <ul v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <li
          v-for="hotel in hotels"
          :key="hotel.id"
          class="flex flex-col items-start gap-4 rounded-2xl border border-gray-200 p-5"
        >
          <Building2 :size="28" class="text-brand" aria-hidden="true" />
          <div class="min-w-0 max-w-full">
            <p class="truncate font-medium text-ink">
              {{ hotel.name || $t("properties.untitled") }}
            </p>
            <p class="truncate text-xs text-muted">
              {{ hotel.address || hotel.id }}
            </p>
          </div>
          <NuxtLink :to="`/properties/${hotel.id}`">
            <el-button type="primary" plain size="small">{{
              $t("properties.manage")
            }}</el-button>
          </NuxtLink>
        </li>
      </ul>

      <div v-if="total > filters.limit" class="mt-4 flex justify-end">
        <el-pagination
          :current-page="filters.page"
          :page-size="filters.limit"
          :total="total"
          layout="prev, pager, next, total"
          @current-change="onPageChange"
        />
      </div>
    </UiSectionCard>
  </section>
</template>
