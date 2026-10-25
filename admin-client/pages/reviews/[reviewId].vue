<script setup lang="ts">
import { mediaImageUrl } from "~/utils/images";
import {
  deleteReviewReply,
  fetchReview,
  replyToReview,
  setReviewStatus,
  updateReviewReply,
  type Review,
} from "~/services/api/reviews";
import { formatDateTime } from "~/utils/format";
import {
  canReplyToReview,
  formatRating,
  reviewStatusTagType,
  reviewTransitions,
} from "~/utils/reviews";

const route = useRoute();
const auth = useAuthStore();
const { can } = usePermissions();
const { t } = useI18n();
const config = useRuntimeConfig();

const reviewId = computed(() => String(route.params.reviewId));
const loading = ref(false);
const detailError = ref("");
const detailRequests = useRequestVersion();
const busy = ref(false);
const review = ref<Review | null>(null);

const statusLabel = (status: string) => t(`reviews.status.${status}`);

const replyDraft = ref("");
const editingReply = ref(false);

const moderationDialog = reactive({
  visible: false,
  target: "",
  reason: "",
});

const reviewerLabel = computed(() => {
  const user = review.value?.user;
  if (!user) {
    return "—";
  }
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return name || user.id;
});

const criteria = computed(() => {
  const value = review.value;
  if (!value) {
    return [];
  }
  return [
    {
      labelKey: "reviews.criteria.cleanliness",
      score: value.rating_cleanliness,
    },
    { labelKey: "reviews.criteria.location", score: value.rating_location },
    { labelKey: "reviews.criteria.service", score: value.rating_service },
    { labelKey: "reviews.criteria.value", score: value.rating_value },
  ];
});

const availableTransitions = computed(() =>
  review.value ? reviewTransitions(review.value.status) : []
);

useEditorGuard(
  "review-detail",
  computed(
    () =>
      !!review.value &&
      replyDraft.value !== (review.value.reply?.reply_text ?? "")
  ),
  busy
);
const load = async () => {
  const current = detailRequests.begin();
  review.value = null;
  detailError.value = "";
  loading.value = false;
  if (!auth.activeHotelId || !can("review.read")) return;
  loading.value = true;
  try {
    const result = await fetchReview(reviewId.value);
    if (!current()) return;
    review.value = result;
    replyDraft.value = result.reply?.reply_text ?? "";
    editingReply.value = false;
  } catch (error) {
    if (!current()) return;
    detailError.value = (error as Error).message;
    review.value = null;
  } finally {
    if (current()) loading.value = false;
  }
};

const openModeration = (target: string) => {
  moderationDialog.visible = true;
  moderationDialog.target = target;
  moderationDialog.reason = "";
};

const confirmModeration = async () => {
  busy.value = true;
  try {
    await setReviewStatus(reviewId.value, {
      status: moderationDialog.target,
      reason: moderationDialog.reason || undefined,
    });
    ElMessage.success(
      t("reviews.toast.statusSet", {
        status: statusLabel(moderationDialog.target),
      })
    );
    moderationDialog.visible = false;
    await load();
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    busy.value = false;
  }
};

const submitReply = async () => {
  if (!replyDraft.value.trim()) {
    ElMessage.warning(t("reviews.toast.replyRequired"));
    return;
  }
  busy.value = true;
  try {
    if (review.value?.reply) {
      await updateReviewReply(reviewId.value, replyDraft.value.trim());
      ElMessage.success(t("reviews.toast.replyUpdated"));
    } else {
      await replyToReview(reviewId.value, replyDraft.value.trim());
      ElMessage.success(t("reviews.toast.replyPosted"));
    }
    await load();
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    busy.value = false;
  }
};

const removeReply = async () => {
  busy.value = true;
  try {
    await deleteReviewReply(reviewId.value);
    ElMessage.success(t("reviews.toast.replyRemoved"));
    await load();
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    busy.value = false;
  }
};

watch(
  [reviewId, () => auth.activeHotelId, () => can("review.read")],
  () => {
    moderationDialog.visible = false;
    load();
  },
  { immediate: true }
);
</script>

<template>
  <section v-loading="loading" class="space-y-6">
    <NuxtLink to="/reviews" class="text-sm text-action">{{
      $t("reviews.back")
    }}</NuxtLink>
    <UiPageHeader
      :title="review ? reviewerLabel : $t('reviews.detail.title')"
      :subtitle="auth.activeHotel?.name ?? undefined"
      ><template #description
        ><el-tag
          v-if="review"
          :type="reviewStatusTagType(review.status)"
          effect="light"
        >
          {{ statusLabel(review.status) }}
        </el-tag></template
      ><template #actions>
        <div v-if="review" class="flex flex-wrap items-center gap-2">
          <Can permission="review.moderate">
            <el-button
              v-for="target in availableTransitions"
              :key="target"
              :type="
                target === 'published'
                  ? 'primary'
                  : target === 'deleted'
                    ? 'danger'
                    : 'default'
              "
              :plain="target === 'deleted'"
              :disabled="busy"
              @click="openModeration(target)"
            >
              {{
                $t(
                  target === "published"
                    ? "reviews.action.publish"
                    : target === "hidden"
                      ? "reviews.action.hide"
                      : "reviews.action.delete"
                )
              }}
            </el-button>
          </Can>
        </div>
      </template></UiPageHeader
    >

    <el-alert
      v-if="detailError"
      :title="detailError"
      type="error"
      :closable="false"
      show-icon
    />
    <el-button v-if="detailError" @click="load">{{
      $t("common.refresh")
    }}</el-button>
    <el-empty
      v-if="!loading && !review && !detailError"
      :description="$t('reviews.detail.notFound')"
    />

    <div v-if="review" class="tn-detail-grid">
      <UiSectionCard>
        <template #header>
          <span class="font-medium">{{ $t("reviews.section.review") }}</span>
        </template>
        <el-descriptions :column="1" class="mb-4">
          <el-descriptions-item :label="$t('reviews.col.reviewer')">{{
            reviewerLabel
          }}</el-descriptions-item>
          <el-descriptions-item :label="$t('reviews.col.hotel')">
            {{ review.hotel?.name || "—" }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('reviews.col.submitted')">
            {{ formatDateTime(review.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('reviews.col.overallRating')">
            <span class="text-lg font-semibold"
              >{{ formatRating(review.rating_overall) }}/10</span
            >
          </el-descriptions-item>
          <el-descriptions-item :label="$t('reviews.col.verified')">
            {{ review.is_verified ? $t("reviews.yes") : $t("reviews.no") }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('reviews.col.helpfulVotes')">
            {{ review.helpful_count }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('reviews.col.booking')" :span="3">
            <NuxtLink
              v-if="review.booking_id"
              :to="`/bookings/${review.booking_id}`"
              class="text-action"
            >
              {{ review.booking_id }}
            </NuxtLink>
            <span v-else>—</span>
          </el-descriptions-item>
        </el-descriptions>

        <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div
            v-for="item in criteria"
            :key="item.labelKey"
            class="rounded-lg border border-slate-200 p-3"
          >
            <p class="text-xs text-muted">{{ $t(item.labelKey) }}</p>
            <p class="text-lg font-semibold text-ink">
              {{ formatRating(item.score)
              }}<span v-if="item.score != null">/10</span>
            </p>
          </div>
        </div>

        <h3 v-if="review.title" class="text-base font-semibold text-ink">
          {{ review.title }}
        </h3>
        <p class="mt-1 whitespace-pre-line text-sm text-ink">
          {{ review.comment || "—" }}
        </p>

        <div v-if="review.media?.length" class="mt-4 flex flex-wrap gap-2">
          <el-image
            v-for="media in review.media"
            :key="media.id"
            :src="
              mediaImageUrl(
                media.thumbnail_url || media.url,
                config.public.mediaBase
              )
            "
            :preview-src-list="[
              mediaImageUrl(media.url, config.public.mediaBase),
            ]"
            fit="cover"
            class="h-24 w-24 rounded-lg"
            preview-teleported
          />
        </div>
      </UiSectionCard>

      <UiSectionCard>
        <template #header>
          <div class="flex w-full flex-wrap items-center justify-between gap-2">
            <span class="font-medium">{{ $t("reviews.reply.title") }}</span>
            <Can permission="review.reply">
              <div v-if="review.reply && !editingReply" class="flex gap-2">
                <el-button size="small" @click="editingReply = true">
                  {{ $t("reviews.action.edit") }}
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  plain
                  :loading="busy"
                  @click="removeReply"
                >
                  {{ $t("reviews.action.delete") }}
                </el-button>
              </div>
            </Can>
          </div>
        </template>

        <template v-if="review.reply && !editingReply">
          <p class="whitespace-pre-line text-sm text-ink">
            {{ review.reply.reply_text }}
          </p>
          <p class="mt-2 text-xs text-muted">
            {{
              review.reply.user
                ? `${review.reply.user.first_name ?? ""} ${review.reply.user.last_name ?? ""}`.trim()
                : $t("reviews.reply.staff")
            }}
            · {{ formatDateTime(review.reply.created_at) }}
          </p>
        </template>

        <template v-else>
          <div v-if="can('review.reply')">
            <el-input
              v-model="replyDraft"
              :aria-label="$t('reviews.reply.title')"
              type="textarea"
              :rows="4"
              :placeholder="
                canReplyToReview(review.status)
                  ? $t('reviews.reply.placeholder')
                  : $t('reviews.reply.disabled')
              "
              :disabled="!canReplyToReview(review.status)"
            />
            <div class="mt-3 flex gap-2">
              <el-button
                type="primary"
                :loading="busy"
                :disabled="!canReplyToReview(review.status)"
                @click="submitReply"
              >
                {{
                  review.reply
                    ? $t("reviews.reply.save")
                    : $t("reviews.reply.post")
                }}
              </el-button>
              <el-button v-if="review.reply" @click="editingReply = false">
                {{ $t("common.cancel") }}
              </el-button>
            </div>
          </div>
          <p v-else class="text-sm text-muted">
            {{ $t("reviews.reply.noPermission") }}
          </p>
        </template>
      </UiSectionCard>
    </div>

    <el-dialog
      v-model="moderationDialog.visible"
      :title="$t('reviews.dialog.title')"
      width="440px"
    >
      <p class="mb-3 text-sm text-slate-600">
        {{ $t("reviews.dialog.setToPrefix") }}
        <strong>{{ statusLabel(moderationDialog.target) }}</strong
        >{{ $t("reviews.dialog.setToSuffix") }}
      </p>
      <el-input
        v-model="moderationDialog.reason"
        type="textarea"
        :rows="3"
        :aria-label="$t('reviews.dialog.reason')"
        :placeholder="$t('reviews.dialog.reason')"
      />
      <template #footer>
        <el-button @click="moderationDialog.visible = false">{{
          $t("common.cancel")
        }}</el-button>
        <el-button type="primary" :loading="busy" @click="confirmModeration">
          {{ $t("reviews.dialog.confirm") }}
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>
