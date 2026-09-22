<script setup lang="ts">
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
  reviewStatusLabel,
  reviewStatusTagType,
  reviewTransitions,
} from "~/utils/reviews";

const route = useRoute();
const router = useRouter();
const { can } = usePermissions();

const reviewId = computed(() => String(route.params.reviewId));
const loading = ref(false);
const busy = ref(false);
const review = ref<Review | null>(null);

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
    { label: "Cleanliness", score: value.rating_cleanliness },
    { label: "Location", score: value.rating_location },
    { label: "Service", score: value.rating_service },
    { label: "Value", score: value.rating_value },
  ];
});

const availableTransitions = computed(() =>
  review.value ? reviewTransitions(review.value.status) : []
);

const load = async () => {
  loading.value = true;
  try {
    const result = await fetchReview(reviewId.value);
    review.value = result;
    replyDraft.value = result.reply?.reply_text ?? "";
    editingReply.value = false;
  } catch (error) {
    ElMessage.error((error as Error).message);
    review.value = null;
  } finally {
    loading.value = false;
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
    ElMessage.success(`Review ${reviewStatusLabel(moderationDialog.target).toLowerCase()}`);
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
    ElMessage.warning("Reply cannot be empty");
    return;
  }
  busy.value = true;
  try {
    if (review.value?.reply) {
      await updateReviewReply(reviewId.value, replyDraft.value.trim());
      ElMessage.success("Reply updated");
    } else {
      await replyToReview(reviewId.value, replyDraft.value.trim());
      ElMessage.success("Reply posted");
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
    ElMessage.success("Reply removed");
    await load();
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    busy.value = false;
  }
};

watch(reviewId, load, { immediate: true });
</script>

<template>
  <section v-loading="loading" class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <el-button link @click="router.push('/reviews')">← Reviews</el-button>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Review</h2>
        <el-tag v-if="review" :type="reviewStatusTagType(review.status)" effect="light">
          {{ reviewStatusLabel(review.status) }}
        </el-tag>
      </div>
      <div v-if="review" class="flex flex-wrap items-center gap-2">
        <Can permission="review.moderate">
          <el-button
            v-for="target in availableTransitions"
            :key="target"
            :type="target === 'published' ? 'primary' : target === 'deleted' ? 'danger' : 'default'"
            :plain="target === 'deleted'"
            :disabled="busy"
            @click="openModeration(target)"
          >
            {{ target === "published" ? "Publish" : target === "hidden" ? "Hide" : "Delete" }}
          </el-button>
        </Can>
      </div>
    </div>

    <el-empty v-if="!loading && !review" description="Review not found" />

    <template v-if="review">
      <el-card class="shadow-sm">
        <template #header><span class="font-medium">Review</span></template>
        <el-descriptions :column="3" border class="mb-4">
          <el-descriptions-item label="Reviewer">{{ reviewerLabel }}</el-descriptions-item>
          <el-descriptions-item label="Hotel">{{ review.hotel?.name || "—" }}</el-descriptions-item>
          <el-descriptions-item label="Submitted">{{ formatDateTime(review.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="Overall rating">
            <span class="text-lg font-semibold">{{ formatRating(review.rating_overall) }}</span> / 10
          </el-descriptions-item>
          <el-descriptions-item label="Verified">
            {{ review.is_verified ? "Yes" : "No" }}
          </el-descriptions-item>
          <el-descriptions-item label="Helpful votes">{{ review.helpful_count }}</el-descriptions-item>
          <el-descriptions-item label="Booking" :span="3">
            <NuxtLink v-if="review.booking_id" :to="`/bookings/${review.booking_id}`" class="text-emerald-600">
              {{ review.booking_id }}
            </NuxtLink>
            <span v-else>—</span>
          </el-descriptions-item>
        </el-descriptions>

        <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div v-for="item in criteria" :key="item.label" class="rounded-lg border border-slate-200 p-3">
            <p class="text-xs text-slate-500">{{ item.label }}</p>
            <p class="text-lg font-semibold text-slate-900">{{ formatRating(item.score) }}</p>
          </div>
        </div>

        <h3 v-if="review.title" class="text-base font-semibold text-slate-900">{{ review.title }}</h3>
        <p class="mt-1 whitespace-pre-line text-sm text-slate-700">{{ review.comment || "—" }}</p>

        <div v-if="review.media?.length" class="mt-4 flex flex-wrap gap-2">
          <el-image
            v-for="media in review.media"
            :key="media.id"
            :src="media.thumbnail_url || media.url"
            :preview-src-list="[media.url]"
            fit="cover"
            class="h-24 w-24 rounded-lg"
            preview-teleported
          />
        </div>
      </el-card>

      <el-card class="shadow-sm">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-medium">Property reply</span>
            <Can permission="review.reply">
              <div v-if="review.reply && !editingReply" class="flex gap-2">
                <el-button size="small" @click="editingReply = true">Edit</el-button>
                <el-button size="small" type="danger" plain :loading="busy" @click="removeReply">
                  Delete
                </el-button>
              </div>
            </Can>
          </div>
        </template>

        <template v-if="review.reply && !editingReply">
          <p class="whitespace-pre-line text-sm text-slate-700">{{ review.reply.reply_text }}</p>
          <p class="mt-2 text-xs text-slate-400">
            {{ review.reply.user ? `${review.reply.user.first_name ?? ""} ${review.reply.user.last_name ?? ""}`.trim() : "Staff" }}
            · {{ formatDateTime(review.reply.created_at) }}
          </p>
        </template>

        <template v-else>
          <div v-if="can('review.reply')">
            <el-input
              v-model="replyDraft"
              type="textarea"
              :rows="4"
              :placeholder="canReplyToReview(review.status) ? 'Write a reply…' : 'Replies are disabled for deleted reviews.'"
              :disabled="!canReplyToReview(review.status)"
            />
            <div class="mt-3 flex gap-2">
              <el-button type="primary" :loading="busy" :disabled="!canReplyToReview(review.status)" @click="submitReply">
                {{ review.reply ? "Save reply" : "Post reply" }}
              </el-button>
              <el-button v-if="review.reply" @click="editingReply = false">Cancel</el-button>
            </div>
          </div>
          <p v-else class="text-sm text-slate-500">You do not have permission to reply to reviews.</p>
        </template>
      </el-card>
    </template>

    <el-dialog v-model="moderationDialog.visible" title="Moderate review" width="440px">
      <p class="mb-3 text-sm text-slate-600">
        Set this review to
        <strong>{{ reviewStatusLabel(moderationDialog.target) }}</strong>.
      </p>
      <el-input
        v-model="moderationDialog.reason"
        type="textarea"
        :rows="3"
        placeholder="Reason (recorded in the audit log)"
      />
      <template #footer>
        <el-button @click="moderationDialog.visible = false">Cancel</el-button>
        <el-button type="primary" :loading="busy" @click="confirmModeration">Confirm</el-button>
      </template>
    </el-dialog>
  </section>
</template>
