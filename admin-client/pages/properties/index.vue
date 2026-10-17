<script setup lang="ts">
import { fetchHotels, type HotelSummary } from "~/services/api/catalog";

const auth = useAuthStore();
const { t } = useI18n();

const hotels = ref<HotelSummary[]>([]);
const loading = ref(false);

const load = async () => {
  loading.value = true;
  try {
    // Prefer the hotels the signed-in user can manage (from /admin/me); fall
    // back to the full list for platform staff without hotel memberships.
    if (auth.hotels.length > 0) {
      hotels.value = auth.hotels.map((hotel) => ({
        id: hotel.id,
        name: hotel.name || t("properties.untitled"),
      }));
      return;
    }
    const result = await fetchHotels({ limit: 100 });
    hotels.value = result.data;
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loading.value = false;
  }
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
    </el-card>
  </section>
</template>
