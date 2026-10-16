<script setup lang="ts">
import { useI18n } from "vue-i18n";
import {
  BED_TYPES,
  ROOM_STATUSES,
  deleteHotelPhoto,
  fetchAmenities,
  fetchRoomAmenities,
  fetchRoomPhotos,
  fetchRooms,
  setPrimaryRoomPhoto,
  setRoomAmenities,
  updateRoom,
  uploadRoomPhoto,
  type Amenity,
  type HotelPhoto,
  type Room,
} from "~/services/api/catalog";

const route = useRoute();
const auth = useAuthStore();
const { t } = useI18n();

const roomId = computed(() => String(route.params.roomId));

const loading = ref(false);
const saving = ref(false);
const room = ref<Room | null>(null);

const form = reactive({
  roomName: "",
  roomType: "",
  bedType: "",
  maxGuests: undefined as number | undefined,
  quantity: undefined as number | undefined,
  roomSize: undefined as number | undefined,
  status: "active" as string,
});

const photos = ref<HotelPhoto[]>([]);
const uploadingPhotos = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const activeTab = ref("details");

const amenities = ref<Amenity[]>([]);
const selectedAmenityIds = ref<string[]>([]);
const savingAmenities = ref(false);

const toNumberOrUndefined = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const amenitiesByCategory = computed(() => {
  const groups = new Map<string, Amenity[]>();
  amenities.value.forEach((amenity) => {
    const list = groups.get(amenity.category) ?? [];
    list.push(amenity);
    groups.set(amenity.category, list);
  });
  return Array.from(groups.entries()).map(([category, items]) => ({ category, items }));
});

const applyRoom = (data: Room) => {
  room.value = data;
  form.roomName = data.room_name ?? "";
  form.roomType = data.room_type ?? "";
  form.bedType = data.bed_type ?? "";
  form.maxGuests = toNumberOrUndefined(data.max_guests);
  form.quantity = toNumberOrUndefined(data.quantity);
  form.roomSize = toNumberOrUndefined(data.room_size);
  form.status = data.status ?? "active";
};

const load = async () => {
  const hotelId = auth.activeHotelId;
  if (!hotelId) {
    return;
  }
  loading.value = true;
  try {
    const rooms = await fetchRooms(hotelId);
    const found = rooms.find((item) => item.id === roomId.value) ?? null;
    if (!found) {
      room.value = null;
      return;
    }
    applyRoom(found);

    const [roomPhotos, catalog, assigned] = await Promise.all([
      fetchRoomPhotos(roomId.value).catch(() => []),
      fetchAmenities({ applicableTo: "room", limit: 200 }).catch(() => ({ data: [] as Amenity[] })),
      fetchRoomAmenities(hotelId, roomId.value).catch(() => [] as string[]),
    ]);
    photos.value = roomPhotos;
    amenities.value = catalog.data;
    selectedAmenityIds.value = assigned;
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loading.value = false;
  }
};

const save = async () => {
  const hotelId = auth.activeHotelId;
  if (!hotelId) {
    return;
  }
  if (!form.roomName.trim()) {
    ElMessage.warning(t("rooms.nameRequired"));
    return;
  }
  saving.value = true;
  try {
    const updated = await updateRoom(hotelId, roomId.value, {
      roomName: form.roomName,
      roomType: form.roomType,
      bedType: form.bedType || undefined,
      maxGuests: form.maxGuests,
      quantity: form.quantity,
      roomSize: form.roomSize,
      status: form.status,
    });
    applyRoom(updated);
    ElMessage.success(t("rooms.updated"));
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    saving.value = false;
  }
};

const saveAmenities = async () => {
  const hotelId = auth.activeHotelId;
  if (!hotelId) {
    return;
  }
  savingAmenities.value = true;
  try {
    await setRoomAmenities(hotelId, roomId.value, selectedAmenityIds.value);
    ElMessage.success(t("rooms.amenitiesUpdated"));
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    savingAmenities.value = false;
  }
};

const triggerPhotoPicker = () => fileInput.value?.click();

const onPhotosSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  if (files.length === 0) {
    return;
  }
  uploadingPhotos.value = true;
  try {
    for (const file of files) {
      await uploadRoomPhoto(roomId.value, file, photos.value.length === 0);
    }
    ElMessage.success(`${files.length} photo(s) uploaded.`);
    photos.value = await fetchRoomPhotos(roomId.value);
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    uploadingPhotos.value = false;
    input.value = "";
  }
};

const makePrimary = async (photo: HotelPhoto) => {
  try {
    await setPrimaryRoomPhoto(roomId.value, photo.id);
    photos.value = await fetchRoomPhotos(roomId.value);
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
};

const removePhoto = async (photo: HotelPhoto) => {
  try {
    await ElMessageBox.confirm("Delete this photo?", "Delete photo", {
      type: "warning",
      confirmButtonText: t("common.delete"),
    });
  } catch {
    return;
  }
  try {
    await deleteHotelPhoto(photo.id);
    photos.value = await fetchRoomPhotos(roomId.value);
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
};

watch([roomId, () => auth.activeHotelId], load, { immediate: true });
</script>

<template>
  <section v-loading="loading" class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <NuxtLink to="/rooms" class="text-sm text-emerald-600 hover:underline">
          {{ $t("rooms.back") }}
        </NuxtLink>
        <h2 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          {{ room?.room_name || $t("rooms.title") }}
        </h2>
      </div>
      <el-tag v-if="room" :type="room.status === 'active' ? 'success' : 'info'">
        {{ room.status }}
      </el-tag>
    </div>

    <el-empty v-if="!loading && !room" :description="$t('rooms.notFound')" />

    <el-tabs v-else v-model="activeTab" type="border-card">
      <el-tab-pane :label="$t('rooms.details')">
        <el-form label-position="top">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <el-form-item :label="$t('rooms.roomName')">
              <el-input v-model="form.roomName" />
            </el-form-item>
            <el-form-item :label="$t('rooms.roomType')">
              <el-input v-model="form.roomType" placeholder="e.g. Deluxe" />
            </el-form-item>
            <el-form-item :label="$t('rooms.bedType')">
              <el-select v-model="form.bedType" clearable class="w-full">
                <el-option v-for="bed in BED_TYPES" :key="bed" :label="bed" :value="bed" />
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('common.status')">
              <el-select v-model="form.status" class="w-full">
                <el-option v-for="status in ROOM_STATUSES" :key="status" :label="status" :value="status" />
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('rooms.maxGuests')">
              <el-input-number v-model="form.maxGuests" :min="1" class="w-full" />
            </el-form-item>
            <el-form-item :label="$t('common.allotment')">
              <el-input-number v-model="form.quantity" :min="0" class="w-full" />
            </el-form-item>
            <el-form-item :label="$t('rooms.roomSize')">
              <el-input-number v-model="form.roomSize" :min="0" class="w-full" />
            </el-form-item>
          </div>
          <Can permission="room.update">
            <el-button type="primary" :loading="saving" @click="save">
              {{ $t("common.save") }}
            </el-button>
          </Can>
        </el-form>
      </el-tab-pane>

      <el-tab-pane :label="`${$t('rooms.photos')} (${photos.length})`">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-slate-500">{{ $t("rooms.photosHint") }}</p>
          <Can permission="room.update">
            <el-button type="primary" size="small" :loading="uploadingPhotos" @click="triggerPhotoPicker">
              {{ $t("rooms.uploadPhotos") }}
            </el-button>
          </Can>
        </div>

        <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="onPhotosSelected" />

        <el-empty v-if="photos.length === 0" :description="$t('rooms.noPhotos')" />
        <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div v-for="photo in photos" :key="photo.id" class="overflow-hidden rounded-lg border border-slate-200">
            <img :src="photo.url" alt="" class="h-32 w-full object-cover" />
            <div class="flex items-center justify-between gap-2 p-2">
              <el-tag v-if="photo.is_primary" type="success" size="small">{{ $t("rooms.primary") }}</el-tag>
              <span v-else />
              <div class="flex gap-1">
                <Can permission="room.update">
                  <el-button v-if="!photo.is_primary" size="small" text @click="makePrimary(photo)">
                    {{ $t("rooms.setPrimary") }}
                  </el-button>
                  <el-button size="small" text type="danger" @click="removePhoto(photo)">
                    {{ $t("common.delete") }}
                  </el-button>
                </Can>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane :label="$t('rooms.amenities')">
        <el-empty v-if="amenities.length === 0" :description="$t('rooms.amenitiesHint')" />
        <template v-else>
          <div v-for="group in amenitiesByCategory" :key="group.category" class="mb-5">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {{ group.category.replace(/_/g, " ") }}
            </p>
            <el-checkbox-group v-model="selectedAmenityIds">
              <el-checkbox v-for="amenity in group.items" :key="amenity.id" :value="amenity.id">
                {{ amenity.name }}
              </el-checkbox>
            </el-checkbox-group>
          </div>
          <Can permission="room.update">
            <el-button type="primary" :loading="savingAmenities" @click="saveAmenities">
              {{ $t("rooms.saveAmenities") }}
            </el-button>
          </Can>
        </template>
      </el-tab-pane>
    </el-tabs>
  </section>
</template>
