<script setup lang="ts">
import { fetchHotels, type HotelSummary } from "~/services/api/hotels";

const loading = ref(false);
const error = ref<string | null>(null);
const hotels = ref<HotelSummary[]>([]);
const total = ref(0);
const page = ref(1);
const limit = ref(20);
const search = ref("");
const status = ref<string | undefined>(undefined);

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    const result = await fetchHotels({
      page: page.value,
      limit: limit.value,
      search: search.value || undefined,
      status: status.value,
    });
    hotels.value = result.data;
    total.value = result.meta.total;
  } catch (err) {
    hotels.value = [];
    total.value = 0;
    error.value = err instanceof Error ? err.message : "Failed to load hotels";
  } finally {
    loading.value = false;
  }
};

const onSearch = () => {
  page.value = 1;
  load();
};

const onFilterChange = () => {
  page.value = 1;
  load();
};

watch(page, load);
onMounted(load);
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
          Hotels
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          Every property on the platform · {{ total }} total
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <el-input
          v-model="search"
          placeholder="Search by name"
          clearable
          class="w-56"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <el-select
          v-model="status"
          placeholder="All statuses"
          clearable
          class="w-44"
          @change="onFilterChange"
        >
          <el-option label="Active" value="active" />
          <el-option label="Inactive" value="inactive" />
          <el-option label="Pending" value="pending" />
          <el-option label="Suspended" value="suspended" />
        </el-select>
        <el-button :loading="loading" @click="onSearch">Search</el-button>
      </div>
    </div>

    <el-alert
      v-if="error"
      type="error"
      :title="error"
      :closable="false"
      show-icon
    />

    <el-table v-loading="loading" :data="hotels" stripe>
      <el-table-column label="Name" min-width="220">
        <template #default="{ row }">
          <NuxtLink
            :to="`/hotels/${row.id}`"
            class="font-medium text-indigo-600 hover:text-indigo-800"
          >
            {{ row.name }}
          </NuxtLink>
        </template>
      </el-table-column>
      <el-table-column label="City" min-width="140">
        <template #default="{ row }">{{ row.city?.name || "—" }}</template>
      </el-table-column>
      <el-table-column label="Country" min-width="120">
        <template #default="{ row }">{{ row.country?.name || "—" }}</template>
      </el-table-column>
      <el-table-column label="Class" width="90">
        <template #default="{ row }">{{ row.hotelClass ?? "—" }}</template>
      </el-table-column>
      <el-table-column label="Status" width="120">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" effect="plain">
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Owner" min-width="200">
        <template #default="{ row }">{{ row.owner?.email || "—" }}</template>
      </el-table-column>
      <el-table-column label="Created" min-width="170">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
    </el-table>

    <div class="flex justify-end">
      <el-pagination
        v-model:current-page="page"
        :page-size="limit"
        :total="total"
        layout="prev, pager, next, total"
        background
      />
    </div>
  </section>
</template>
