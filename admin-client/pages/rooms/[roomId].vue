<script setup lang="ts">
import {
  fetchRooms,
  fetchAmenities,
  fetchRoomAmenities,
  setRoomAmenities,
  updateRoom,
  type Room,
  type Amenity,
} from "~/services/api/catalog";
import {
  basicRoomPayload,
  configurationPayload,
  roomDraft,
  sameDraft,
} from "~/utils/rooms";
const auth = useAuthStore();
const route = useRoute();
const { can } = usePermissions();
const { t } = useI18n();
const { categoryLabel, amenityLabel } = useAmenityLabels();
const roomId = computed(() => String(route.params.roomId));
const room = ref<Room | null>(null);
const form = ref(roomDraft());
const saved = ref(roomDraft());
const loading = ref(false);
const error = ref("");
const saving = ref<"basic" | "configuration" | "">("");
const mediaPending = ref(false);
const mediaDirty = ref(false);
const savingAmenities = ref(false);
const amenities = ref<Amenity[]>([]);
const selectedAmenityIds = ref<string[]>([]);
const savedAmenityIds = ref<string[]>([]);
const amenityError = ref("");
const amenitiesLoading = ref(false);
const basicDirty = computed(
  () => !sameDraft(basicRoomPayload(form.value), basicRoomPayload(saved.value))
);
const configDirty = computed(
  () =>
    !sameDraft(
      configurationPayload(form.value),
      configurationPayload(saved.value)
    )
);
const amenitiesDirty = computed(
  () =>
    !sameDraft(
      [...selectedAmenityIds.value].sort(),
      [...savedAmenityIds.value].sort()
    )
);
const dirty = computed(
  () =>
    basicDirty.value ||
    configDirty.value ||
    amenitiesDirty.value ||
    mediaDirty.value
);
const pending = computed(
  () => !!saving.value || mediaPending.value || savingAmenities.value
);
useEditorGuard("room-detail", dirty, pending);
const editable = computed(
  () => can("room.update") && !pending.value && !loading.value
);
const groups = computed(() => {
  const result = new Map<string, Amenity[]>();
  for (const amenity of amenities.value)
    result.set(amenity.category, [
      ...(result.get(amenity.category) ?? []),
      amenity,
    ]);
  return [...result.entries()];
});
let version = 0;
const loadAmenities = async () => {
  const request = version;
  const hotelId = auth.activeHotelId;
  if (!hotelId || !can("room.read")) return;
  amenitiesLoading.value = true;
  amenityError.value = "";
  try {
    const [catalog, assigned] = await Promise.all([
      fetchAmenities({ applicableTo: "room", limit: 200 }),
      fetchRoomAmenities(hotelId, roomId.value),
    ]);
    if (request !== version) return;
    amenities.value = catalog.data;
    selectedAmenityIds.value = [...assigned];
    savedAmenityIds.value = [...assigned];
  } catch (failure) {
    if (request === version) amenityError.value = (failure as Error).message;
  } finally {
    if (request === version) amenitiesLoading.value = false;
  }
};
const load = async () => {
  const request = ++version;
  const hotelId = auth.activeHotelId;
  room.value = null;
  form.value = roomDraft();
  saved.value = roomDraft();
  error.value = "";
  selectedAmenityIds.value = [];
  savedAmenityIds.value = [];
  amenities.value = [];
  mediaDirty.value = false;
  mediaPending.value = false;
  if (!hotelId || !can("room.read")) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const data = await fetchRooms(hotelId);
    if (request !== version) return;
    const found = data.find((item) => item.id === roomId.value);
    if (found) {
      room.value = found;
      form.value = roomDraft(found);
      saved.value = roomDraft(found);
      await loadAmenities();
    }
  } catch (failure) {
    if (request === version) error.value = (failure as Error).message;
  } finally {
    if (request === version) loading.value = false;
  }
};
watch([roomId, () => auth.activeHotelId, () => can("room.read")], load, {
  immediate: true,
});
onBeforeUnmount(() => {
  version++;
});
const save = async (section: "basic" | "configuration") => {
  const hotelId = auth.activeHotelId;
  if (!hotelId || !room.value || !editable.value) return;
  if (section === "basic" && !form.value.roomName.trim()) {
    ElMessage.warning(t("rooms.nameRequired"));
    return;
  }
  const clearingType =
    section === "basic" && saved.value.roomType && !form.value.roomType.trim();
  const clearingConfiguration =
    section === "configuration" &&
    (["maxGuests", "quantity", "roomSize"] as const).some(
      (key) => saved.value[key] !== undefined && form.value[key] === undefined
    );
  if (clearingType || clearingConfiguration) {
    ElMessage.warning(t("rooms.cannotClear"));
    return;
  }
  saving.value = section;
  const request = version;
  const payload =
    section === "basic"
      ? basicRoomPayload(form.value)
      : configurationPayload(form.value);
  try {
    const updated = await updateRoom(hotelId, roomId.value, payload);
    if (request !== version) return;
    room.value = updated;
    const snapshot = roomDraft(updated);
    // Deliberately merge only this section. Other drafts must survive the response.
    if (section === "basic") {
      for (const key of ["roomName", "roomType", "status"] as const) {
        form.value[key] = snapshot[key];
        saved.value[key] = snapshot[key];
      }
    } else {
      form.value.bedType = saved.value.bedType = snapshot.bedType;
      for (const key of ["maxGuests", "quantity", "roomSize"] as const) {
        form.value[key] = snapshot[key];
        saved.value[key] = snapshot[key];
      }
    }
    ElMessage.success(t("rooms.updated"));
  } catch (failure) {
    if (request === version) ElMessage.error((failure as Error).message);
  } finally {
    saving.value = "";
  }
};
const saveAmenities = async () => {
  if (
    !auth.activeHotelId ||
    !editable.value ||
    amenityError.value ||
    amenitiesLoading.value
  )
    return;
  savingAmenities.value = true;
  const request = version;
  const ids = [...selectedAmenityIds.value];
  try {
    const assigned = await setRoomAmenities(
      auth.activeHotelId,
      roomId.value,
      ids
    );
    if (request === version) {
      selectedAmenityIds.value = [...assigned];
      savedAmenityIds.value = [...assigned];
      ElMessage.success(t("rooms.amenitiesUpdated"));
    }
  } catch (failure) {
    if (request === version) ElMessage.error((failure as Error).message);
  } finally {
    savingAmenities.value = false;
  }
};
</script>
<template>
  <section class="space-y-6">
    <NuxtLink to="/rooms" class="text-sm text-action">{{
      $t("rooms.back")
    }}</NuxtLink>
    <UiPageHeader
      :title="room?.room_name ?? $t('rooms.title')"
      :subtitle="auth.activeHotel?.name ?? $t('common.noHotelSelected')"
      ><template #actions
        ><UiStatusPill
          v-if="room"
          :tone="
            room.status === 'active'
              ? 'success'
              : room.status === 'maintenance'
                ? 'warning'
                : 'neutral'
          "
          >{{ $t(`rooms.status.${room.status ?? "inactive"}`) }}</UiStatusPill
        ></template
      ></UiPageHeader
    >
    <UiEmptyState v-if="!can('room.read')" :title="$t('editor.forbidden')" />
    <UiEmptyState
      v-else-if="!auth.activeHotelId"
      :title="$t('rooms.noHotel')"
    />
    <el-alert
      v-else-if="error"
      :title="error"
      type="error"
      :closable="false"
      show-icon
    />
    <p v-else-if="loading" role="status" class="py-12 text-center text-muted">
      {{ $t("common.loading") }}
    </p>
    <UiEmptyState v-else-if="!room" :title="$t('rooms.notFound')" />
    <template v-else>
      <div class="grid items-start gap-6 xl:grid-cols-2">
        <UiSectionCard :title="$t('rooms.basicInformation')"
          ><template #actions
            ><el-button
              v-if="can('room.update')"
              type="primary"
              :loading="saving === 'basic'"
              :disabled="!basicDirty || pending"
              @click="save('basic')"
              >{{ $t("rooms.saveBasic") }}</el-button
            ></template
          ><RoomsRoomFields
            v-model="form"
            section="basic"
            :disabled="!editable"
        /></UiSectionCard>
        <UiSectionCard :title="$t('rooms.configuration')"
          ><template #actions
            ><el-button
              v-if="can('room.update')"
              type="primary"
              :loading="saving === 'configuration'"
              :disabled="!configDirty || pending"
              @click="save('configuration')"
              >{{ $t("rooms.saveConfiguration") }}</el-button
            ></template
          ><RoomsRoomFields
            v-model="form"
            section="configuration"
            :disabled="!editable"
        /></UiSectionCard>
      </div>
      <RoomsRoomMedia
        :key="`${auth.activeHotelId}:${roomId}`"
        :room-id="roomId"
        :editable="can('room.update') && !saving && !savingAmenities"
        @pending="mediaPending = $event"
        @dirty="mediaDirty = $event"
      />
      <UiSectionCard :title="$t('rooms.amenities')"
        ><template #actions
          ><el-button
            v-if="can('room.update')"
            type="primary"
            :loading="savingAmenities"
            :disabled="
              !amenitiesDirty || pending || !!amenityError || amenitiesLoading
            "
            @click="saveAmenities"
            >{{ $t("rooms.saveAmenities") }}</el-button
          ></template
        >
        <div v-if="amenityError" role="alert">
          <el-alert
            :title="amenityError"
            type="error"
            :closable="false"
          /><el-button class="mt-3" @click="loadAmenities">{{
            $t("common.refresh")
          }}</el-button>
        </div>
        <p v-else-if="amenitiesLoading" role="status">
          {{ $t("common.loading") }}
        </p>
        <UiEmptyState
          v-else-if="!amenities.length"
          :title="$t('rooms.amenitiesHint')"
        />
        <div
          v-for="[category, items] in groups"
          v-else
          :key="category"
          class="mb-5"
        >
          <h3 class="mb-2 text-sm font-medium text-muted">
            {{ categoryLabel(category) }}
          </h3>
          <el-checkbox-group v-model="selectedAmenityIds" :disabled="!editable"
            ><el-checkbox
              v-for="amenity in items"
              :key="amenity.id"
              :value="amenity.id"
              >{{ amenityLabel(amenity) }}</el-checkbox
            ></el-checkbox-group
          >
        </div>
      </UiSectionCard>
    </template>
  </section>
</template>
