<script setup lang="ts">
import {
  BedDouble,
  Users,
  Maximize,
  Layers,
  Plus,
  ArrowUpRight,
} from "lucide-vue-next";
import {
  ROOM_STATUSES,
  deleteRoom,
  fetchRooms,
  fetchRoomPhotos,
  type HotelPhoto,
  type Room,
} from "~/services/api/catalog";
const auth = useAuthStore();
const { can } = usePermissions();
const { t } = useI18n();
const rooms = ref<Room[]>([]);
const loading = ref(false);
const error = ref("");
const filters = reactive({ search: "", status: "" });
const selectedId = ref<string | null>(null);
const photos = ref<HotelPhoto[]>([]);
const photoError = ref(false);
const photoLoading = ref(false);
const deleting = ref(false);
useEditorGuard(
  "room-list",
  computed(() => false),
  deleting
);
const cache = new Map<string, HotelPhoto[]>();
let loadVersion = 0;
let photoVersion = 0;
const filtered = computed(() =>
  rooms.value.filter(
    (room) =>
      (!filters.status || room.status === filters.status) &&
      `${room.room_name} ${room.room_type ?? ""}`
        .toLocaleLowerCase()
        .includes(filters.search.trim().toLocaleLowerCase())
  )
);
const selected = computed(
  () =>
    filtered.value.find((room) => room.id === selectedId.value) ??
    filtered.value[0]
);
const tone = (status?: string | null) =>
  status === "active"
    ? "success"
    : status === "maintenance"
      ? "warning"
      : "neutral";
const load = async () => {
  const version = ++loadVersion;
  const hotelId = auth.activeHotelId;
  rooms.value = [];
  selectedId.value = null;
  photos.value = [];
  error.value = "";
  cache.clear();
  if (!hotelId || !can("room.read")) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const result = await fetchRooms(hotelId);
    if (version === loadVersion) rooms.value = result;
  } catch (failure) {
    if (version === loadVersion) error.value = (failure as Error).message;
  } finally {
    if (version === loadVersion) loading.value = false;
  }
};
watch(
  [() => auth.activeHotelId, () => can("room.read")],
  () => {
    filters.search = "";
    filters.status = "";
    load();
  },
  { immediate: true }
);
watch(
  () => selected.value?.id,
  async (roomId) => {
    const version = ++photoVersion;
    photos.value = [];
    photoError.value = false;
    photoLoading.value = false;
    if (!roomId || !auth.activeHotelId) return;
    const key = `${auth.activeHotelId}:${roomId}`;
    if (cache.has(key)) {
      photos.value = cache.get(key)!;
      return;
    }
    photoLoading.value = true;
    try {
      const result = await fetchRoomPhotos(roomId);
      if (version === photoVersion) {
        photos.value = result;
        cache.set(key, result);
      }
    } catch {
      if (version === photoVersion) photoError.value = true;
    } finally {
      if (version === photoVersion) photoLoading.value = false;
    }
  }
);
const deactivate = async (room: Room) => {
  if (!auth.activeHotelId || !can("room.delete") || deleting.value) return;
  deleting.value = true;
  const hotelId = auth.activeHotelId;
  try {
    await ElMessageBox.confirm(
      t("rooms.confirmDeactivate", { name: room.room_name }),
      t("rooms.deactivateTitle"),
      { type: "warning", confirmButtonText: t("common.deactivate") }
    );
    await deleteRoom(hotelId, room.id);
    ElMessage.success(t("rooms.deactivated"));
    await load();
  } catch (failure) {
    if (failure instanceof Error) ElMessage.error(failure.message);
  } finally {
    deleting.value = false;
  }
};
</script>
<template>
  <section class="space-y-6">
    <UiPageHeader
      :title="$t('rooms.title')"
      :subtitle="auth.activeHotel?.name ?? $t('common.noHotelSelected')"
    >
      <template #actions
        ><el-button
          :loading="loading"
          :disabled="!auth.activeHotelId || !can('room.read')"
          @click="load"
          >{{ $t("common.refresh") }}</el-button
        ><NuxtLink
          v-if="can('room.create') && auth.activeHotelId"
          to="/rooms/new"
          ><el-button type="primary"
            ><Plus :size="16" class="mr-2" aria-hidden="true" />{{
              $t("rooms.addRoom")
            }}</el-button
          ></NuxtLink
        ></template
      >
    </UiPageHeader>
    <UiEmptyState v-if="!can('room.read')" :title="$t('editor.forbidden')" />
    <UiEmptyState
      v-else-if="!auth.activeHotelId"
      :title="$t('rooms.noHotel')"
    />
    <template v-else>
      <UiFilterBar
        ><el-input
          v-model="filters.search"
          :aria-label="$t('rooms.searchPlaceholder')"
          :placeholder="$t('rooms.searchPlaceholder')"
          clearable
          class="sm:!w-64"
        /><el-select
          v-model="filters.status"
          :aria-label="$t('rooms.statusFilter')"
          :placeholder="$t('rooms.statusFilter')"
          clearable
          class="sm:!w-48"
          ><el-option
            v-for="status in ROOM_STATUSES"
            :key="status"
            :label="$t(`rooms.status.${status}`)"
            :value="status" /></el-select
        ><span class="ml-auto text-xs text-muted">{{
          $t("rooms.roomCount", { count: filtered.length })
        }}</span></UiFilterBar
      >
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        :closable="false"
        show-icon
      />
      <p v-else-if="loading" role="status" class="py-12 text-center text-muted">
        {{ $t("common.loading") }}
      </p>
      <UiEmptyState v-else-if="!filtered.length" :title="$t('rooms.empty')" />
      <div
        v-else
        class="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
      >
        <UiSectionCard :title="$t('rooms.categories')"
          ><div class="space-y-3">
            <article
              v-for="room in filtered"
              :key="room.id"
              class="rounded-2xl border p-4"
              :class="
                selected?.id === room.id
                  ? 'border-action bg-soft'
                  : 'border-gray-200'
              "
            >
              <div class="flex gap-4">
                <div
                  class="hidden h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-soft to-gray-100 sm:flex"
                  aria-hidden="true"
                >
                  <BedDouble :size="32" class="text-action" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <h2>
                      <NuxtLink
                        :to="`/rooms/${room.id}`"
                        class="text-lg font-medium text-ink xl:hidden"
                        >{{ room.room_name }}</NuxtLink
                      ><button
                        type="button"
                        class="hidden text-left text-lg font-medium text-ink xl:block"
                        :aria-pressed="selected?.id === room.id"
                        @click="selectedId = room.id"
                      >
                        {{ room.room_name }}
                      </button>
                    </h2>
                    <UiStatusPill :tone="tone(room.status)">{{
                      $t(`rooms.status.${room.status ?? "inactive"}`)
                    }}</UiStatusPill>
                  </div>
                  <p class="mt-1 text-sm text-muted">
                    {{ room.room_type || $t("common.notAvailable") }}
                  </p>
                  <dl
                    class="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-gray-200 pt-3 text-xs text-muted"
                  >
                    <div class="flex items-center gap-1">
                      <Maximize :size="14" aria-hidden="true" />
                      <dt class="sr-only">{{ $t("rooms.roomSize") }}</dt>
                      <dd>{{ room.room_size ?? "—" }} m²</dd>
                    </div>
                    <div class="flex items-center gap-1">
                      <Users :size="14" aria-hidden="true" />
                      <dt class="sr-only">{{ $t("rooms.maxGuests") }}</dt>
                      <dd>{{ room.max_guests ?? "—" }}</dd>
                    </div>
                    <div class="flex items-center gap-1">
                      <Layers :size="14" aria-hidden="true" />
                      <dt>{{ $t("common.allotment") }}</dt>
                      <dd>{{ room.quantity ?? "—" }}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              <div class="mt-3 flex flex-wrap items-center justify-end gap-3">
                <button
                  v-if="can('room.delete')"
                  type="button"
                  class="text-xs text-red-800 underline"
                  :disabled="deleting"
                  @click="deactivate(room)"
                >
                  {{ $t("common.deactivate") }}</button
                ><NuxtLink
                  :to="`/rooms/${room.id}`"
                  class="inline-flex items-center gap-1 text-xs text-action"
                  :aria-label="
                    $t('rooms.manageNamed', { name: room.room_name })
                  "
                  >{{ $t("rooms.manage")
                  }}<ArrowUpRight :size="14" aria-hidden="true"
                /></NuxtLink>
              </div>
            </article></div
        ></UiSectionCard>
        <UiSectionCard
          v-if="selected"
          class="hidden xl:block"
          :title="selected.room_name"
          :description="selected.room_type ?? undefined"
        >
          <p
            v-if="photoLoading"
            role="status"
            class="py-12 text-center text-muted"
          >
            {{ $t("common.loading") }}
          </p>
          <img
            v-else-if="photos[0]?.url"
            :src="photos[0].url"
            :alt="selected.room_name"
            class="aspect-video w-full rounded-xl object-cover"
          />
          <div
            v-else
            class="flex aspect-video items-center justify-center rounded-xl bg-soft text-sm text-muted"
          >
            {{ $t(photoError ? "rooms.photosFailed" : "rooms.noPhotos") }}
          </div>
          <div v-if="photos.length > 1" class="mt-3 grid grid-cols-4 gap-2">
            <img
              v-for="photo in photos.slice(1, 5)"
              :key="photo.id"
              :src="photo.url"
              alt=""
              class="aspect-square rounded-lg object-cover"
            />
          </div>
          <p class="my-5 text-sm text-muted">
            {{ $t("rooms.availabilityHint") }}
          </p>
          <NuxtLink :to="`/rooms/${selected.id}`"
            ><el-button type="primary">{{
              $t("rooms.manage")
            }}</el-button></NuxtLink
          >
        </UiSectionCard>
      </div>
    </template>
  </section>
</template>
