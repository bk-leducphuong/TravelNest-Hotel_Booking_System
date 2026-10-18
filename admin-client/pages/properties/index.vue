<script setup lang="ts">
import { fetchHotels, type HotelSummary } from "~/services/api/catalog";

const loading = ref(false);
const hotels = ref<HotelSummary[]>([]);
const total = ref(0);

const filters = reactive({
  search: "",
  page: 1,
  limit: 20,
});

const load = async () => {
  loading.value = true;
  try {
    // The admin catalog list is already scoped server-side: platform staff see
    // all hotels, everyone else only the hotels they belong to.
    const result = await fetchHotels({
      search: filters.search || undefined,
      page: filters.page,
      limit: filters.limit,
    });
    hotels.value = result.data;
    total.value = result.meta.total;
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loading.value = false;
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

onMounted(load);
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-2xl font-semibold tracking-tight text-slate-900">{{ $t('properties.title') }}</h2>
      <p class="mt-1 text-sm text-slate-500">
        {{ $t('properties.subtitle') }}
      </p>
    </div>

    <el-card class="shadow-sm">
      <div class="flex flex-wrap items-end gap-3">
        <el-input
          v-model="filters.search"
          :placeholder="$t('properties.searchPlaceholder')"
          clearable
          class="w-72"
          @keyup.enter="applySearch"
          @clear="applySearch"
        />
        <el-button type="primary" @click="applySearch">{{ $t('common.search') }}</el-button>
      </div>
    </el-card>

    <el-card v-loading="loading" class="shadow-sm">
      <el-empty
        v-if="!loading && hotels.length === 0"
        :description="$t('properties.emptyManage')"
      />

      <ul v-else class="divide-y divide-slate-100">
        <li
          v-for="hotel in hotels"
          :key="hotel.id"
          class="flex items-center justify-between gap-4 py-3"
        >
          <div class="min-w-0">
            <p class="truncate font-medium text-slate-900">
              {{ hotel.name || $t('properties.untitled') }}
            </p>
            <p class="truncate text-xs text-slate-500">{{ hotel.address || hotel.id }}</p>
          </div>
          <NuxtLink :to="`/properties/${hotel.id}`">
            <el-button type="primary" plain size="small">{{ $t('properties.manage') }}</el-button>
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
    </el-card>
  </section>
</template>
