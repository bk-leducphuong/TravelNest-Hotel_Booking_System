<script setup lang="ts">
import {
  fetchRoomPhotos,
  uploadRoomPhoto,
  deleteHotelPhoto,
  setPrimaryRoomPhoto,
  type HotelPhoto,
} from "~/services/api/catalog";
const props = defineProps<{ roomId: string; editable: boolean }>();
const emit = defineEmits<{
  pending: [value: boolean];
  dirty: [value: boolean];
}>();
const { t } = useI18n();
const photos = ref<HotelPhoto[]>([]);
const loading = ref(false);
const busy = ref(false);
const error = ref("");
const fileInput = ref<HTMLInputElement | null>(null);
const queue = ref<{ file: File; done: boolean; error: string }[]>([]);
const unfinished = computed(() => queue.value.some((item) => !item.done));
watch(busy, (value) => emit("pending", value), { flush: "sync" });
watch(unfinished, (value) => emit("dirty", value), { flush: "sync" });
let version = 0;
const load = async () => {
  const request = ++version;
  loading.value = true;
  error.value = "";
  try {
    const result = await fetchRoomPhotos(props.roomId);
    if (request === version) photos.value = result;
  } catch (failure) {
    if (request === version) error.value = (failure as Error).message;
  } finally {
    if (request === version) loading.value = false;
  }
};
onMounted(load);
onBeforeUnmount(() => {
  version++;
});
const upload = async () => {
  if (!props.editable || busy.value || loading.value || error.value) return;
  busy.value = true;
  try {
    for (const item of queue.value.filter((entry) => !entry.done)) {
      item.error = "";
      try {
        const photo = await uploadRoomPhoto(
          props.roomId,
          item.file,
          photos.value.length === 0
        );
        item.done = true;
        photos.value.push(photo);
      } catch (failure) {
        item.error = (failure as Error).message;
      }
    }
    if (!unfinished.value) {
      queue.value = [];
      ElMessage.success(t("rooms.photosUploaded"));
    }
  } finally {
    busy.value = false;
  }
};
const selectFiles = (event: Event) => {
  const input = event.target as HTMLInputElement;
  queue.value.push(
    ...Array.from(input.files ?? []).map((file) => ({
      file,
      done: false,
      error: "",
    }))
  );
  input.value = "";
  upload();
};
const makePrimary = async (photo: HotelPhoto) => {
  if (!props.editable || busy.value) return;
  busy.value = true;
  try {
    await setPrimaryRoomPhoto(props.roomId, photo.id);
    photos.value.forEach((entry) => {
      entry.is_primary = entry.id === photo.id;
    });
  } catch (failure) {
    ElMessage.error((failure as Error).message);
  } finally {
    busy.value = false;
  }
};
const remove = async (photo: HotelPhoto) => {
  if (!props.editable || busy.value) return;
  busy.value = true;
  try {
    await ElMessageBox.confirm(
      t("rooms.confirmPhotoDelete"),
      t("rooms.deletePhoto"),
      { type: "warning", confirmButtonText: t("common.delete") }
    );
    await deleteHotelPhoto(photo.id);
    photos.value = photos.value.filter((entry) => entry.id !== photo.id);
  } catch (failure) {
    if (failure instanceof Error) ElMessage.error(failure.message);
  } finally {
    busy.value = false;
  }
};
</script>
<template>
  <UiSectionCard
    :title="$t('rooms.photos')"
    :description="$t('rooms.mediaImmediate')"
  >
    <template #actions
      ><el-button
        v-if="editable"
        :loading="busy"
        :disabled="loading || !!error"
        @click="fileInput?.click()"
        >{{ $t("rooms.uploadPhotos") }}</el-button
      ></template
    >
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      :aria-label="$t('rooms.uploadPhotos')"
      @change="selectFiles"
    />
    <div v-if="error" role="alert" class="mb-4">
      <el-alert :title="error" type="error" :closable="false" /><el-button
        class="mt-3"
        @click="load"
        >{{ $t("common.refresh") }}</el-button
      >
    </div>
    <p v-if="loading" role="status">{{ $t("common.loading") }}</p>
    <UiEmptyState
      v-else-if="!error && !photos.length"
      :title="$t('rooms.noPhotos')"
    />
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="photo in photos"
        :key="photo.id"
        class="overflow-hidden rounded-xl border border-gray-200"
      >
        <img
          v-if="photo.url"
          :src="photo.url"
          :alt="photo.original_filename ?? $t('rooms.photos')"
          class="aspect-video w-full object-cover"
        />
        <div class="flex flex-wrap items-center gap-2 p-3">
          <UiStatusPill v-if="photo.is_primary" tone="info">{{
            $t("rooms.primary")
          }}</UiStatusPill
          ><template v-if="editable"
            ><el-button
              v-if="!photo.is_primary"
              size="small"
              :disabled="busy"
              @click="makePrimary(photo)"
              >{{ $t("rooms.setPrimary") }}</el-button
            ><el-button
              size="small"
              type="danger"
              plain
              :disabled="busy"
              @click="remove(photo)"
              >{{ $t("common.delete") }}</el-button
            ></template
          >
        </div>
      </div>
    </div>
    <div
      v-if="queue.length"
      class="mt-5 rounded-xl bg-soft p-4"
      aria-live="polite"
    >
      <p class="text-sm font-medium">{{ $t("rooms.uploadQueue") }}</p>
      <ul class="my-3 space-y-2">
        <li
          v-for="(item, index) in queue"
          :key="index"
          class="break-words text-sm"
        >
          <span
            >{{ item.file.name }} ·
            {{
              $t(
                item.done
                  ? "rooms.uploadDone"
                  : item.error
                    ? "rooms.uploadFailed"
                    : "rooms.uploadPending"
              )
            }}</span
          >
          <p v-if="item.error" class="text-red-800">{{ item.error }}</p>
        </li>
      </ul>
      <div class="flex flex-wrap gap-2">
        <el-button
          v-if="unfinished"
          :loading="busy"
          :disabled="loading || !!error"
          @click="upload"
          >{{ $t("rooms.retryUploads") }}</el-button
        ><el-button :disabled="busy" @click="queue = []">{{
          $t("rooms.dismissQueue")
        }}</el-button>
      </div>
    </div>
  </UiSectionCard>
</template>
