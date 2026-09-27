<script setup lang="ts">
import { fetchReviews, type Review } from "~/services/api/reviews";
import { formatDateTime } from "~/utils/format";
import {
  REVIEW_STATUSES,
  formatRating,
  reviewStatusLabel,
  reviewStatusTagType,
} from "~/utils/reviews";

const auth = useAuthStore();
const router = useRouter();

const loading = ref(false);
const reviews = ref<Review[]>([]);
const total = ref(0);

const filters = reactive({
  status: "",
  minRating: undefined as number | undefined,
  maxRating: undefined as number | undefined,
  hasReply: "",
  q: "",
  page: 1,
  limit: 20,
});

const statusOptions = REVIEW_STATUSES.map((status) => ({ value: status, label: reviewStatusLabel(status) }));
const ratingOptions = Array.from({ length: 10 }, (_, index) => 10 - index);
const replyOptions = [
  { value: "true", label: "Replied" },
  { value: "false", label: "Unreplied" },
];

const reviewerLabel = (review: Review) => {
  const user = review.user;
  if (!user) {
    return "—";
  }
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return name || user.id;
};

const load = async () => {
  if (!auth.activeHotelId) {
    return;
  }
  loading.value = true;
  try {
    const result = await fetchReviews({
      status: filters.status || undefined,
      minRating: filters.minRating,
      maxRating: filters.maxRating,
      hasReply: filters.hasReply || undefined,
      q: filters.q || undefined,
      page: filters.page,
      limit: filters.limit,
    });
    reviews.value = result.data;
    total.value = result.meta.total;
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loading.value = false;
  }
};

const applyFilters = () => {
  filters.page = 1;
  load();
};

const resetFilters = () => {
  filters.status = "";
  filters.minRating = undefined;
  filters.maxRating = undefined;
  filters.hasReply = "";
  filters.q = "";
  filters.page = 1;
  load();
};

const onPageChange = (page: number) => {
  filters.page = page;
  load();
};

const openReview = (row: Review) => router.push(`/reviews/${row.id}`);

watch(
  () => auth.activeHotelId,
  () => {
    filters.page = 1;
    load();
  },
  { immediate: true }
);
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Reviews</h2>
        <p class="mt-1 text-sm text-slate-500">{{ auth.activeHotel?.name || "No hotel selected" }}</p>
      </div>
      <el-button :loading="loading" :disabled="!auth.activeHotelId" @click="load">Refresh</el-button>
    </div>

    <el-empty v-if="!auth.activeHotelId" description="Select a hotel to moderate reviews." />

    <template v-else>
      <el-card class="shadow-sm">
        <div class="flex flex-wrap items-end gap-3">
          <el-select v-model="filters.status" placeholder="All statuses" clearable class="w-44">
            <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
          <el-select v-model="filters.minRating" placeholder="Min rating" clearable class="w-36">
            <el-option v-for="value in ratingOptions" :key="value" :label="`${value}+`" :value="value" />
          </el-select>
          <el-select v-model="filters.maxRating" placeholder="Max rating" clearable class="w-36">
            <el-option v-for="value in ratingOptions" :key="value" :label="`≤ ${value}`" :value="value" />
          </el-select>
          <el-select v-model="filters.hasReply" placeholder="Reply" clearable class="w-36">
            <el-option v-for="option in replyOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
          <el-input v-model="filters.q" placeholder="Search text" clearable class="w-56" />
          <el-button type="primary" @click="applyFilters">Apply</el-button>
          <el-button @click="resetFilters">Reset</el-button>
        </div>
      </el-card>

      <el-card class="shadow-sm">
        <el-table v-loading="loading" :data="reviews" row-key="id" @row-click="openReview">
          <el-table-column label="Date" width="160">
            <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="Reviewer" min-width="150">
            <template #default="{ row }">{{ reviewerLabel(row) }}</template>
          </el-table-column>
          <el-table-column label="Rating" width="90" align="center">
            <template #default="{ row }">{{ formatRating(row.rating_overall) }}</template>
          </el-table-column>
          <el-table-column label="Review" min-width="240">
            <template #default="{ row }">
              <span class="font-medium text-slate-700">{{ row.title || "—" }}</span>
              <span class="ml-2 text-slate-500">{{ (row.comment || "").slice(0, 60) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="Reply" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.reply ? 'success' : 'info'" effect="plain" size="small">
                {{ row.reply ? "Yes" : "No" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Status" width="120">
            <template #default="{ row }">
              <el-tag :type="reviewStatusTagType(row.status)" effect="light">{{ reviewStatusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="" width="90" align="right">
            <template #default="{ row }">
              <el-button link type="primary" @click.stop="openReview(row)">View</el-button>
            </template>
          </el-table-column>
          <template #empty><el-empty description="No reviews found" :image-size="60" /></template>
        </el-table>

        <div class="mt-4 flex justify-end">
          <el-pagination
            :current-page="filters.page"
            :page-size="filters.limit"
            :total="total"
            layout="prev, pager, next, total"
            @current-change="onPageChange"
          />
        </div>
      </el-card>
    </template>
  </section>
</template>
