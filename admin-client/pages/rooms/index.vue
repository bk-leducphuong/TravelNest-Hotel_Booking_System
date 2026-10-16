<script setup lang="ts">
import { useI18n } from "vue-i18n";
import {
  ROOM_STATUSES,
  deleteRoom,
  createRoom,
  fetchRooms,
  updateRoom,
  type Room,
} from "~/services/api/catalog";

const auth = useAuthStore();
const { t } = useI18n();

const loading = ref(false);
const saving = ref(false);
const rooms = ref<Room[]>([]);

const filters = reactive({
  search: "",
  status: "",
});

const dialog = ref(false);
const editingRoomId = ref<string | null>(null);
const form = reactive({
  roomName: "",
  roomType: "",
  maxGuests: undefined as number | undefined,
  quantity: undefined as number | undefined,
  roomSize: undefined as number | undefined,
  status: "active" as string,
});

const toNumberOrUndefined = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const filteredRooms = computed(() => {
  const term = filters.search.trim().toLowerCase();
  return rooms.value.filter((room) => {
    if (filters.status && room.status !== filters.status) {
      return false;
    }
    if (!term) {
      return true;
    }
    return [room.room_name, room.room_type].some((value) =>
      String(value ?? "").toLowerCase().includes(term)
    );
  });
});

const statusTagType = (status?: string | null) => {
  if (status === "active") return "success";
  if (status === "maintenance") return "warning";
  return "info";
};

const load = async () => {
  if (!auth.activeHotelId) {
    rooms.value = [];
    return;
  }
  loading.value = true;
  try {
    rooms.value = await fetchRooms(auth.activeHotelId);
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  editingRoomId.value = null;
  Object.assign(form, {
    roomName: "",
    roomType: "",
    maxGuests: undefined,
    quantity: undefined,
    roomSize: undefined,
    status: "active",
  });
  dialog.value = true;
};

const openEdit = (room: Room) => {
  editingRoomId.value = room.id;
  Object.assign(form, {
    roomName: room.room_name ?? "",
    roomType: room.room_type ?? "",
    maxGuests: toNumberOrUndefined(room.max_guests),
    quantity: toNumberOrUndefined(room.quantity),
    roomSize: toNumberOrUndefined(room.room_size),
    status: room.status ?? "active",
  });
  dialog.value = true;
};

const submit = async () => {
  if (!auth.activeHotelId) {
    return;
  }
  if (!form.roomName.trim()) {
    ElMessage.warning(t("rooms.nameRequired"));
    return;
  }
  saving.value = true;
  try {
    const payload = {
      roomName: form.roomName,
      roomType: form.roomType,
      maxGuests: form.maxGuests,
      quantity: form.quantity,
      roomSize: form.roomSize,
      status: form.status,
    };
    if (editingRoomId.value) {
      await updateRoom(auth.activeHotelId, editingRoomId.value, payload);
      ElMessage.success(t("rooms.updated"));
    } else {
      await createRoom(auth.activeHotelId, payload);
      ElMessage.success(t("rooms.created"));
    }
    dialog.value = false;
    await load();
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    saving.value = false;
  }
};

const deactivate = async (room: Room) => {
  if (!auth.activeHotelId) {
    return;
  }
  try {
    await ElMessageBox.confirm(
      t("rooms.confirmDeactivate", { name: room.room_name }),
      t("rooms.deactivateTitle"),
      { type: "warning", confirmButtonText: t("common.deactivate") }
    );
  } catch {
    return;
  }
  try {
    await deleteRoom(auth.activeHotelId, room.id);
    ElMessage.success(t("rooms.deactivated"));
    await load();
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
};

watch(() => auth.activeHotelId, load, { immediate: true });
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">{{ $t("rooms.title") }}</h2>
        <p class="mt-1 text-sm text-slate-500">
          {{ auth.activeHotel?.name || $t("common.noHotelSelected") }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <el-button :loading="loading" :disabled="!auth.activeHotelId" @click="load">
          {{ $t("common.refresh") }}
        </el-button>
        <Can permission="room.create">
          <el-button type="primary" :disabled="!auth.activeHotelId" @click="openCreate">
            {{ $t("rooms.addRoom") }}
          </el-button>
        </Can>
      </div>
    </div>

    <el-empty v-if="!auth.activeHotelId" :description="$t('rooms.noHotel')" />

    <template v-else>
      <el-card class="shadow-sm">
        <div class="flex flex-wrap items-end gap-3">
          <el-input
            v-model="filters.search"
            :placeholder="$t('rooms.searchPlaceholder')"
            clearable
            class="w-56"
          />
          <el-select v-model="filters.status" :placeholder="$t('rooms.statusFilter')" clearable class="w-44">
            <el-option
              v-for="status in ROOM_STATUSES"
              :key="status"
              :label="status"
              :value="status"
            />
          </el-select>
        </div>
      </el-card>

      <el-card class="shadow-sm">
        <el-table v-loading="loading" :data="filteredRooms" row-key="id" style="width: 100%">
          <el-table-column prop="room_name" :label="$t('rooms.roomName')" min-width="180" />
          <el-table-column prop="room_type" :label="$t('rooms.roomType')" min-width="120" />
          <el-table-column prop="max_guests" :label="$t('rooms.maxGuests')" width="100" />
          <el-table-column prop="quantity" :label="$t('common.allotment')" width="110" />
          <el-table-column :label="$t('common.status')" width="130">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="$t('common.actions')" width="260" fixed="right">
            <template #default="{ row }">
              <NuxtLink :to="`/rooms/${row.id}`">
                <el-button size="small" type="primary" plain>{{ $t("rooms.manage") }}</el-button>
              </NuxtLink>
              <Can permission="room.update">
                <el-button size="small" @click="openEdit(row)">{{ $t("common.edit") }}</el-button>
              </Can>
              <Can permission="room.delete">
                <el-button
                  v-if="row.status === 'active'"
                  size="small"
                  type="danger"
                  plain
                  @click="deactivate(row)"
                >
                  {{ $t("common.deactivate") }}
                </el-button>
              </Can>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty :description="$t('rooms.empty')" :image-size="60" />
          </template>
        </el-table>
      </el-card>
    </template>

    <el-dialog
      v-model="dialog"
      :title="editingRoomId ? $t('rooms.editRoom') : $t('rooms.addRoom')"
      width="480px"
    >
      <el-form label-position="top">
        <el-form-item :label="$t('rooms.roomName')">
          <el-input v-model="form.roomName" />
        </el-form-item>
        <el-form-item :label="$t('rooms.roomType')">
          <el-input v-model="form.roomType" placeholder="e.g. Deluxe" />
        </el-form-item>
        <div class="grid grid-cols-2 gap-3">
          <el-form-item :label="$t('rooms.maxGuests')">
            <el-input-number v-model="form.maxGuests" :min="1" class="w-full" />
          </el-form-item>
          <el-form-item :label="$t('common.allotment')">
            <el-input-number v-model="form.quantity" :min="0" class="w-full" />
          </el-form-item>
          <el-form-item :label="$t('rooms.roomSize')">
            <el-input-number v-model="form.roomSize" :min="0" class="w-full" />
          </el-form-item>
          <el-form-item :label="$t('common.status')">
            <el-select v-model="form.status" class="w-full">
              <el-option v-for="status in ROOM_STATUSES" :key="status" :label="status" :value="status" />
            </el-select>
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">{{ $t("common.cancel") }}</el-button>
        <el-button type="primary" :loading="saving" @click="submit">{{ $t("common.save") }}</el-button>
      </template>
    </el-dialog>
  </section>
</template>
