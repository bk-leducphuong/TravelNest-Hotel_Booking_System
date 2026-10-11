<script setup lang="ts">
import { fetchHotel, type HotelDetail } from "~/services/api/hotels";

const route = useRoute();
const hotelId = computed(() => String(route.params.hotelId));

const loading = ref(false);
const error = ref<string | null>(null);
const hotel = ref<HotelDetail | null>(null);

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    hotel.value = await fetchHotel(hotelId.value);
  } catch (err) {
    hotel.value = null;
    error.value = err instanceof Error ? err.message : "Failed to load hotel";
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<template>
  <section class="space-y-6">
    <NuxtLink
      to="/hotels"
      class="text-sm text-indigo-600 hover:text-indigo-800"
    >
      ← Back to hotels
    </NuxtLink>

    <el-alert
      v-if="error"
      type="error"
      :title="error"
      :closable="false"
      show-icon
    />

    <div v-loading="loading">
      <template v-if="hotel">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
              {{ hotel.name }}
            </h2>
            <p class="mt-1 text-sm text-slate-500">
              {{ hotel.city?.name || "—" }}, {{ hotel.country?.name || "—" }}
              <span v-if="hotel.address">· {{ hotel.address }}</span>
            </p>
          </div>
          <el-tag :type="statusTagType(hotel.status)" effect="plain">
            {{ hotel.status }}
          </el-tag>
        </div>

        <div class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <el-card class="shadow-sm">
            <p class="text-xs uppercase tracking-wide text-slate-400">Rooms</p>
            <p class="mt-1 text-2xl font-semibold text-slate-900">
              {{ hotel.counts.rooms }}
            </p>
          </el-card>
          <el-card class="shadow-sm">
            <p class="text-xs uppercase tracking-wide text-slate-400">
              Bookings
            </p>
            <p class="mt-1 text-2xl font-semibold text-slate-900">
              {{ hotel.counts.bookings }}
            </p>
          </el-card>
          <el-card class="shadow-sm">
            <p class="text-xs uppercase tracking-wide text-slate-400">
              Reviews
            </p>
            <p class="mt-1 text-2xl font-semibold text-slate-900">
              {{ hotel.counts.reviews }}
            </p>
          </el-card>
          <el-card class="shadow-sm">
            <p class="text-xs uppercase tracking-wide text-slate-400">Rating</p>
            <p class="mt-1 text-2xl font-semibold text-slate-900">
              {{ hotel.rating ? hotel.rating.overall.toFixed(2) : "—" }}
            </p>
          </el-card>
        </div>

        <el-card class="mt-6 shadow-sm">
          <template #header>
            <span class="font-medium">Team</span>
          </template>
          <el-table :data="hotel.members">
            <el-table-column label="Email" min-width="220">
              <template #default="{ row }">{{
                row.user?.email || "—"
              }}</template>
            </el-table-column>
            <el-table-column label="Role" width="140">
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{
                  row.role || "—"
                }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Primary owner" width="140">
              <template #default="{ row }">
                <el-tag v-if="row.isPrimaryOwner" type="success" size="small"
                  >Yes</el-tag
                >
                <span v-else class="text-slate-400">No</span>
              </template>
            </el-table-column>
            <el-table-column label="Joined" min-width="170">
              <template #default="{ row }">{{
                formatDate(row.joinedAt)
              }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </template>
    </div>
  </section>
</template>
