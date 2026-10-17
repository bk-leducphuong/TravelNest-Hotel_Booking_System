<script setup lang="ts">
import { fetchReviews, type Review } from "~/services/api/reviews";
import { formatDateTime } from "~/utils/format";
import {
  REVIEW_STATUSES,
  formatRating,
  reviewStatusTagType,
} from "~/utils/reviews";

const auth = useAuthStore();
const router = useRouter();
const { t } = useI18n();

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

const statusOptions = computed(() =>
  REVIEW_STATUSES.map((status) => ({
    value: status,
    label: t(`reviews.status.${status}`),
  }))
);
const ratingOptions = Array.from({ length: 10 }, (_, index) => 10 - index);
const replyOptions = computed(() => [
  { value: "true", label: t("reviews.filter.replied") },
  { value: "false", label: t("reviews.filter.unreplied") },
]);

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
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
          {{ $t("nav.reviews") }}
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          {{ auth.activeHotel?.name || $t("dashboard.noHotelSelected") }}
        </p>
      </div>
      <el-button :loading="loading" :disabled="!auth.activeHotelId" @click="load">
        {{ $t("common.refresh") }}
      </el-button>
    </div>

    <el-empty v-if="!auth.activeHotelId" :description="$t('reviews.empty.selectHotel')" />

    <template v-else>
      <el-card class="shadow-sm">
        <div class="flex flex-wrap items-end gap-3">
          <el-select
            v-model="filters.status"
            :placeholder="$t('reviews.filter.allStatuses')"
            clearable
            class="w-44"
          >
            <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
          <el-select
            v-model="filters.minRating"
            :placeholder="$t('reviews.filter.minRating')"
            clearable
            class="w-36"
          >
            <el-option
              v-for="value in ratingOptions"
              :key="value"
              :label="$t('reviews.filter.minRatingOption', { value })"
              :value="value"
            />
          </el-select>
          <el-select
            v-model="filters.maxRating"
            :placeholder="$t('reviews.filter.maxRating')"
            clearable
            class="w-36"
          >
            <el-option
              v-for="value in ratingOptions"
              :key="value"
              :label="$t('reviews.filter.maxRatingOption', { value })"
              :value="value"
            />
          </el-select>
          <el-select
            v-model="filters.hasReply"
            :placeholder="$t('reviews.filter.reply')"
            clearable
            class="w-36"
          >
            <el-option v-for="option in replyOptions" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
          <el-input
            v-model="filters.q"
            :placeholder="$t('reviews.filter.search')"
            clearable
            class="w-56"
          />
          <el-button type="primary" @click="applyFilters">
            {{ $t("reviews.filter.apply") }}
          </el-button>
          <el-button @click="resetFilters">{{ $t("reviews.filter.reset") }}</el-button>
        </div>
      </el-card>

      <el-card class="shadow-sm">
        <el-table v-loading="loading" :data="reviews" row-key="id" @row-click="openReview">
          <el-table-column :label="$t('reviews.col.date')" width="160">
            <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column :label="$t('reviews.col.reviewer')" min-width="150">
            <template #default="{ row }">{{ reviewerLabel(row) }}</template>
          </el-table-column>
          <el-table-column :label="$t('reviews.col.rating')" width="90" align="center">
            <template #default="{ row }">{{ formatRating(row.rating_overall) }}</template>
          </el-table-column>
          <el-table-column :label="$t('reviews.col.review')" min-width="240">
            <template #default="{ row }">
              <span class="font-medium text-slate-700">{{ row.title || "—" }}</span>
              <span class="ml-2 text-slate-500">{{ (row.comment || "").slice(0, 60) }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('reviews.col.reply')" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.reply ? 'success' : 'info'" effect="plain" size="small">
                {{ row.reply ? $t("reviews.yes") : $t("reviews.no") }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="$t('common.status')" width="120">
            <template #default="{ row }">
              <el-tag :type="reviewStatusTagType(row.status)" effect="light">
                {{ $t(`reviews.status.${row.status}`) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="" width="90" align="right">
            <template #default="{ row }">
              <el-button link type="primary" @click.stop="openReview(row)">
                {{ $t("common.view") }}
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty :description="$t('reviews.empty.list')" :image-size="60" />
          </template>
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
