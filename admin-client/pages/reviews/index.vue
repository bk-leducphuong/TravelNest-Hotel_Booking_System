<script setup lang="ts">
import { fetchReviews, type Review } from "~/services/api/reviews";
import { formatDateTime } from "~/utils/format";
import { REVIEW_STATUSES, formatRating } from "~/utils/reviews";

const auth = useAuthStore();
const { can } = usePermissions();
const { t } = useI18n();

const overview = ref<{ reload: () => Promise<void> } | null>(null);
const refreshAll = () => Promise.all([load(), overview.value?.reload()]);
const loading = ref(false);
const listError = ref("");
const listRequests = useRequestVersion();
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
  const current = listRequests.begin();
  listError.value = "";
  reviews.value = [];
  total.value = 0;
  loading.value = false;
  if (!auth.activeHotelId || !can("review.read")) {
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
    if (!current()) return;
    reviews.value = result.data;
    total.value = result.meta.total;
  } catch (error) {
    if (current()) listError.value = (error as Error).message;
  } finally {
    if (current()) loading.value = false;
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

watch(
  [() => auth.activeHotelId, () => can("review.read")],
  () => {
    filters.page = 1;
    load();
  },
  { immediate: true }
);
</script>

<template>
  <section class="space-y-6">
    <UiPageHeader
      :title="$t('nav.reviews')"
      :subtitle="auth.activeHotel?.name || $t('dashboard.noHotelSelected')"
      ><template #actions
        ><el-button
          :loading="loading"
          :disabled="!auth.activeHotelId"
          @click="refreshAll"
        >
          {{ $t("common.refresh") }}
        </el-button></template
      ></UiPageHeader
    >

    <UiEmptyState v-if="!can('review.read')" :title="$t('editor.forbidden')" />
    <el-empty
      v-else-if="!auth.activeHotelId"
      :description="$t('reviews.empty.selectHotel')"
    />

    <template v-else>
      <MetricsOverview ref="overview" kind="reviews" />
      <el-alert
        v-if="listError"
        :title="listError"
        type="error"
        :closable="false"
        show-icon
      />

      <UiFilterBar>
        <div class="flex flex-wrap items-end gap-3">
          <el-select
            v-model="filters.status"
            :aria-label="$t('reviews.filter.allStatuses')"
            :placeholder="$t('reviews.filter.allStatuses')"
            clearable
            class="w-44"
          >
            <el-option
              v-for="option in statusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <el-select
            v-model="filters.minRating"
            :aria-label="$t('reviews.filter.minRating')"
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
            :aria-label="$t('reviews.filter.maxRating')"
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
            :aria-label="$t('reviews.filter.reply')"
            :placeholder="$t('reviews.filter.reply')"
            clearable
            class="w-36"
          >
            <el-option
              v-for="option in replyOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <el-input
            v-model="filters.q"
            :aria-label="$t('reviews.filter.search')"
            :placeholder="$t('reviews.filter.search')"
            clearable
            class="w-56"
          />
          <el-button type="primary" @click="applyFilters">
            {{ $t("reviews.filter.apply") }}
          </el-button>
          <el-button @click="resetFilters">{{
            $t("reviews.filter.reset")
          }}</el-button>
        </div>
      </UiFilterBar>

      <UiSectionCard>
        <p v-if="loading" role="status" class="py-6 text-center text-muted">
          {{ $t("common.loading") }}
        </p>
        <UiEmptyState
          v-else-if="!reviews.length && !listError"
          :title="$t('reviews.empty.list')"
        />
        <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="review in reviews"
            :key="review.id"
            class="flex flex-col rounded-2xl bg-[#f8f8f8] p-5"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3">
                <UiMediaImage
                  v-if="review.user?.profile_picture_url"
                  :src="review.user.profile_picture_url"
                  alt=""
                  compact
                  class="h-10 w-10 rounded-full object-cover"
                /><span
                  v-else
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soft text-brand"
                  aria-hidden="true"
                  >{{ reviewerLabel(review).slice(0, 1) }}</span
                >
                <p class="break-words text-sm font-medium">
                  {{ reviewerLabel(review) }}
                </p>
              </div>
              <span
                class="whitespace-nowrap rounded-full bg-soft px-3 py-1 text-sm font-medium text-brand"
                >{{ formatRating(review.rating_overall) }}/10</span
              >
            </div>
            <p class="mt-3 text-xs text-muted">
              {{ formatDateTime(review.created_at) }}
            </p>
            <h2 v-if="review.title" class="mt-4 font-medium">
              {{ review.title }}
            </h2>
            <p class="mt-2 line-clamp-4 break-words text-sm text-muted">
              {{ review.comment || $t("common.notAvailable") }}
            </p>
            <div class="mt-auto flex flex-wrap items-center gap-2 pt-5">
              <UiStatusPill
                :tone="
                  review.status === 'published'
                    ? 'success'
                    : review.status === 'deleted'
                      ? 'danger'
                      : 'warning'
                "
                >{{ $t(`reviews.status.${review.status}`) }}</UiStatusPill
              ><UiStatusPill :tone="review.reply ? 'info' : 'neutral'">{{
                $t(
                  review.reply
                    ? "reviews.filter.replied"
                    : "reviews.filter.unreplied"
                )
              }}</UiStatusPill
              ><NuxtLink
                :to="`/reviews/${review.id}`"
                class="ml-auto text-sm"
                :aria-label="$t('common.viewRecord', { id: review.id })"
                >{{ $t("common.view") }} →</NuxtLink
              >
            </div>
          </article>
        </div>

        <div class="mt-4 flex justify-end">
          <el-pagination
            :current-page="filters.page"
            :page-size="filters.limit"
            :total="total"
            layout="prev, pager, next, total"
            @current-change="onPageChange"
          />
        </div>
      </UiSectionCard>
    </template>
  </section>
</template>
