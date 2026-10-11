<script setup lang="ts">
import {
  HOTEL_STATUSES,
  POLICY_TYPES,
  ROOM_STATUSES,
  createPolicy,
  createRoom,
  deleteHotelPhoto,
  deletePolicy,
  deleteRoom,
  fetchHotel,
  fetchHotelPhotos,
  setPrimaryHotelPhoto,
  updateHotel,
  updatePolicy,
  updateRoom,
  uploadHotelPhoto,
  type HotelDetail,
  type HotelPhoto,
  type HotelPolicy,
  type Room,
} from "~/services/api/catalog";

const route = useRoute();
const hotelId = computed(() => String(route.params.hotelId));

const loading = ref(false);
const savingHotel = ref(false);
const savingRoom = ref(false);
const savingPolicy = ref(false);
const uploadingPhotos = ref(false);

const hotel = ref<HotelDetail | null>(null);
const rooms = ref<Room[]>([]);
const policies = ref<HotelPolicy[]>([]);
const photos = ref<HotelPhoto[]>([]);

const activeTab = ref("overview");
const fileInput = ref<HTMLInputElement | null>(null);

const triggerPhotoPicker = () => fileInput.value?.click();

const hotelForm = reactive({
  name: "",
  description: "",
  address: "",
  phoneNumber: "",
  latitude: undefined as number | undefined,
  longitude: undefined as number | undefined,
  hotelClass: undefined as number | undefined,
  checkInTime: "",
  checkOutTime: "",
  checkInPolicy: "",
  checkOutPolicy: "",
  minPrice: undefined as number | undefined,
  status: "active",
  timezone: "",
});

const roomDialog = ref(false);
const editingRoomId = ref<string | null>(null);
const roomForm = reactive({
  roomName: "",
  roomType: "",
  maxGuests: undefined as number | undefined,
  quantity: undefined as number | undefined,
  roomSize: undefined as number | undefined,
  status: "active",
});

const policyDialog = ref(false);
const editingPolicyId = ref<string | null>(null);
const policyForm = reactive({
  policyType: "cancellation" as string,
  title: "",
  description: "",
  displayOrder: 0,
  icon: "",
  isActive: true,
});

const toNumberOrUndefined = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const applyHotelForm = (data: HotelDetail) => {
  hotelForm.name = data.name ?? "";
  hotelForm.description = data.description ?? "";
  hotelForm.address = data.address ?? "";
  hotelForm.phoneNumber = data.phone_number ?? "";
  hotelForm.latitude = toNumberOrUndefined(data.latitude);
  hotelForm.longitude = toNumberOrUndefined(data.longitude);
  hotelForm.hotelClass = toNumberOrUndefined(data.hotel_class);
  hotelForm.checkInTime = data.check_in_time ?? "";
  hotelForm.checkOutTime = data.check_out_time ?? "";
  hotelForm.checkInPolicy = data.check_in_policy ?? "";
  hotelForm.checkOutPolicy = data.check_out_policy ?? "";
  hotelForm.minPrice = toNumberOrUndefined(data.min_price);
  hotelForm.status = data.status ?? "active";
  hotelForm.timezone = data.timezone ?? "";
};

const loadDetail = async () => {
  loading.value = true;
  try {
    const detail = await fetchHotel(hotelId.value);
    hotel.value = detail.hotel;
    rooms.value = detail.rooms;
    policies.value = detail.policies;
    applyHotelForm(detail.hotel);
    photos.value = await fetchHotelPhotos(hotelId.value).catch(() => []);
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loading.value = false;
  }
};

const saveHotel = async () => {
  savingHotel.value = true;
  try {
    const payload = {
      name: hotelForm.name,
      description: hotelForm.description,
      address: hotelForm.address,
      phoneNumber: hotelForm.phoneNumber,
      latitude: hotelForm.latitude,
      longitude: hotelForm.longitude,
      hotelClass: hotelForm.hotelClass,
      checkInTime: hotelForm.checkInTime,
      checkOutTime: hotelForm.checkOutTime,
      checkInPolicy: hotelForm.checkInPolicy,
      checkOutPolicy: hotelForm.checkOutPolicy,
      minPrice: hotelForm.minPrice,
      status: hotelForm.status,
      timezone: hotelForm.timezone,
    };
    const updated = await updateHotel(hotelId.value, payload);
    hotel.value = { ...hotel.value, ...updated } as HotelDetail;
    ElMessage.success("Property updated.");
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    savingHotel.value = false;
  }
};

const openCreateRoom = () => {
  editingRoomId.value = null;
  Object.assign(roomForm, {
    roomName: "",
    roomType: "",
    maxGuests: undefined,
    quantity: undefined,
    roomSize: undefined,
    status: "active",
  });
  roomDialog.value = true;
};

const openEditRoom = (room: Room) => {
  editingRoomId.value = room.id;
  Object.assign(roomForm, {
    roomName: room.room_name ?? "",
    roomType: room.room_type ?? "",
    maxGuests: toNumberOrUndefined(room.max_guests),
    quantity: toNumberOrUndefined(room.quantity),
    roomSize: toNumberOrUndefined(room.room_size),
    status: room.status ?? "active",
  });
  roomDialog.value = true;
};

const submitRoom = async () => {
  if (!roomForm.roomName.trim()) {
    ElMessage.warning("Room name is required.");
    return;
  }
  savingRoom.value = true;
  try {
    const payload = {
      roomName: roomForm.roomName,
      roomType: roomForm.roomType,
      maxGuests: roomForm.maxGuests,
      quantity: roomForm.quantity,
      roomSize: roomForm.roomSize,
      status: roomForm.status,
    };
    if (editingRoomId.value) {
      await updateRoom(hotelId.value, editingRoomId.value, payload);
      ElMessage.success("Room updated.");
    } else {
      await createRoom(hotelId.value, payload);
      ElMessage.success("Room created.");
    }
    roomDialog.value = false;
    rooms.value = await fetchRoomsSafe();
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    savingRoom.value = false;
  }
};

const fetchRoomsSafe = async (): Promise<Room[]> => {
  try {
    const detail = await fetchHotel(hotelId.value);
    rooms.value = detail.rooms;
    policies.value = detail.policies;
    return detail.rooms;
  } catch {
    return rooms.value;
  }
};

const removeRoom = async (room: Room) => {
  try {
    await ElMessageBox.confirm(
      `Deactivate room "${room.room_name}"? It stays visible but is marked inactive.`,
      "Deactivate room",
      { type: "warning", confirmButtonText: "Deactivate" }
    );
  } catch {
    return;
  }
  try {
    await deleteRoom(hotelId.value, room.id);
    ElMessage.success("Room deactivated.");
    await fetchRoomsSafe();
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
};

const openCreatePolicy = () => {
  editingPolicyId.value = null;
  Object.assign(policyForm, {
    policyType: "cancellation",
    title: "",
    description: "",
    displayOrder: policies.value.length,
    icon: "",
    isActive: true,
  });
  policyDialog.value = true;
};

const openEditPolicy = (policy: HotelPolicy) => {
  editingPolicyId.value = policy.id;
  Object.assign(policyForm, {
    policyType: policy.policy_type,
    title: policy.title,
    description: policy.description,
    displayOrder: policy.display_order ?? 0,
    icon: policy.icon ?? "",
    isActive: policy.is_active,
  });
  policyDialog.value = true;
};

const submitPolicy = async () => {
  if (!policyForm.title.trim() || !policyForm.description.trim()) {
    ElMessage.warning("Title and description are required.");
    return;
  }
  savingPolicy.value = true;
  try {
    const payload = {
      policyType: policyForm.policyType,
      title: policyForm.title,
      description: policyForm.description,
      displayOrder: policyForm.displayOrder,
      icon: policyForm.icon || null,
      isActive: policyForm.isActive,
    };
    if (editingPolicyId.value) {
      await updatePolicy(hotelId.value, editingPolicyId.value, payload);
      ElMessage.success("Policy updated.");
    } else {
      await createPolicy(hotelId.value, payload);
      ElMessage.success("Policy created.");
    }
    policyDialog.value = false;
    await fetchRoomsSafe();
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    savingPolicy.value = false;
  }
};

const removePolicy = async (policy: HotelPolicy) => {
  try {
    await ElMessageBox.confirm(`Deactivate policy "${policy.title}"?`, "Deactivate policy", {
      type: "warning",
      confirmButtonText: "Deactivate",
    });
  } catch {
    return;
  }
  try {
    await deletePolicy(hotelId.value, policy.id);
    ElMessage.success("Policy deactivated.");
    await fetchRoomsSafe();
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
};

const onPhotosSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  if (files.length === 0) {
    return;
  }
  uploadingPhotos.value = true;
  try {
    for (const file of files) {
      await uploadHotelPhoto(hotelId.value, file, photos.value.length === 0);
    }
    ElMessage.success(`${files.length} photo(s) uploaded.`);
    photos.value = await fetchHotelPhotos(hotelId.value);
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    uploadingPhotos.value = false;
    input.value = "";
  }
};

const makePrimaryPhoto = async (photo: HotelPhoto) => {
  try {
    await setPrimaryHotelPhoto(hotelId.value, photo.id);
    photos.value = await fetchHotelPhotos(hotelId.value);
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
};

const removePhoto = async (photo: HotelPhoto) => {
  try {
    await ElMessageBox.confirm("Delete this photo?", "Delete photo", {
      type: "warning",
      confirmButtonText: "Delete",
    });
  } catch {
    return;
  }
  try {
    await deleteHotelPhoto(photo.id);
    photos.value = await fetchHotelPhotos(hotelId.value);
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
};

watch(hotelId, loadDetail, { immediate: true });
</script>

<template>
  <section class="space-y-6" v-loading="loading">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <NuxtLink to="/properties" class="text-sm text-emerald-600 hover:underline">
          ← Properties
        </NuxtLink>
        <h2 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          {{ hotel?.name || "Property" }}
        </h2>
        <p class="text-sm text-slate-500">{{ hotelId }}</p>
      </div>
      <el-tag v-if="hotel" :type="hotel.status === 'active' ? 'success' : 'info'">
        {{ hotel.status }}
      </el-tag>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="Details" name="overview">
        <el-card class="shadow-sm">
          <el-form label-position="top">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <el-form-item label="Name">
                <el-input v-model="hotelForm.name" />
              </el-form-item>
              <el-form-item label="Status">
                <el-select v-model="hotelForm.status" class="w-full">
                  <el-option v-for="status in HOTEL_STATUSES" :key="status" :label="status" :value="status" />
                </el-select>
              </el-form-item>
              <el-form-item label="Address">
                <el-input v-model="hotelForm.address" />
              </el-form-item>
              <el-form-item label="Phone">
                <el-input v-model="hotelForm.phoneNumber" />
              </el-form-item>
              <el-form-item label="Check-in time">
                <el-input v-model="hotelForm.checkInTime" placeholder="e.g. 14:00-15:00" />
              </el-form-item>
              <el-form-item label="Check-out time">
                <el-input v-model="hotelForm.checkOutTime" placeholder="e.g. 11:00-12:00" />
              </el-form-item>
              <el-form-item label="Latitude">
                <el-input-number v-model="hotelForm.latitude" :controls="false" class="w-full" />
              </el-form-item>
              <el-form-item label="Longitude">
                <el-input-number v-model="hotelForm.longitude" :controls="false" class="w-full" />
              </el-form-item>
              <el-form-item label="Hotel class">
                <el-select v-model="hotelForm.hotelClass" clearable class="w-full">
                  <el-option v-for="n in 5" :key="n" :label="`${n} star`" :value="n" />
                </el-select>
              </el-form-item>
              <el-form-item label="Min price">
                <el-input-number v-model="hotelForm.minPrice" :min="0" :controls="false" class="w-full" />
              </el-form-item>
              <el-form-item label="Timezone">
                <el-input v-model="hotelForm.timezone" placeholder="e.g. Asia/Ho_Chi_Minh" />
              </el-form-item>
            </div>

            <el-form-item label="Description">
              <el-input v-model="hotelForm.description" type="textarea" :rows="3" />
            </el-form-item>
            <el-form-item label="Check-in policy">
              <el-input v-model="hotelForm.checkInPolicy" type="textarea" :rows="2" />
            </el-form-item>
            <el-form-item label="Check-out policy">
              <el-input v-model="hotelForm.checkOutPolicy" type="textarea" :rows="2" />
            </el-form-item>

            <Can permission="hotel.update">
              <el-button type="primary" :loading="savingHotel" @click="saveHotel">
                Save changes
              </el-button>
            </Can>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane :label="`Rooms (${rooms.length})`" name="rooms">
        <el-card class="shadow-sm">
          <div class="mb-4 flex items-center justify-between">
            <p class="text-sm text-slate-500">Room types and allotment. Set nightly prices in Availability.</p>
            <Can permission="room.create">
              <el-button type="primary" size="small" @click="openCreateRoom">Add room</el-button>
            </Can>
          </div>

          <el-empty v-if="rooms.length === 0" description="No rooms yet." />
          <el-table v-else :data="rooms" style="width: 100%">
            <el-table-column prop="room_name" label="Name" min-width="160" />
            <el-table-column prop="room_type" label="Type" min-width="120" />
            <el-table-column prop="max_guests" label="Guests" width="90" />
            <el-table-column prop="quantity" label="Allotment" width="110" />
            <el-table-column prop="status" label="Status" width="110" />
            <el-table-column label="Actions" width="170" fixed="right">
              <template #default="{ row }">
                <Can permission="room.update">
                  <el-button size="small" @click="openEditRoom(row)">Edit</el-button>
                </Can>
                <Can permission="room.delete">
                  <el-button size="small" type="danger" plain @click="removeRoom(row)">Deactivate</el-button>
                </Can>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane :label="`Policies (${policies.length})`" name="policies">
        <el-card class="shadow-sm">
          <div class="mb-4 flex items-center justify-between">
            <p class="text-sm text-slate-500">Policies shown on the hotel page.</p>
            <Can permission="hotel.update">
              <el-button type="primary" size="small" @click="openCreatePolicy">Add policy</el-button>
            </Can>
          </div>

          <el-empty v-if="policies.length === 0" description="No policies yet." />
          <el-table v-else :data="policies" style="width: 100%">
            <el-table-column prop="policy_type" label="Type" width="140" />
            <el-table-column prop="title" label="Title" min-width="160" />
            <el-table-column prop="display_order" label="Order" width="90" />
            <el-table-column label="Active" width="100">
              <template #default="{ row }">
                <el-tag :type="row.is_active ? 'success' : 'info'" size="small">
                  {{ row.is_active ? "Active" : "Inactive" }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Actions" width="160" fixed="right">
              <template #default="{ row }">
                <Can permission="hotel.update">
                  <el-button size="small" @click="openEditPolicy(row)">Edit</el-button>
                  <el-button size="small" type="danger" plain @click="removePolicy(row)">Deactivate</el-button>
                </Can>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane :label="`Photos (${photos.length})`" name="photos">
        <el-card class="shadow-sm">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm text-slate-500">Hotel gallery. The primary photo is shown first.</p>
            <Can permission="hotel.update">
              <el-button
                type="primary"
                size="small"
                :loading="uploadingPhotos"
                @click="triggerPhotoPicker"
              >
                Upload photos
              </el-button>
            </Can>
          </div>

          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            multiple
            class="hidden"
            @change="onPhotosSelected"
          />

          <el-empty v-if="photos.length === 0" description="No photos yet." />
          <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div
              v-for="photo in photos"
              :key="photo.id"
              class="overflow-hidden rounded-lg border border-slate-200"
            >
              <img :src="photo.url" alt="" class="h-32 w-full object-cover" />
              <div class="flex items-center justify-between gap-2 p-2">
                <el-tag v-if="photo.is_primary" type="success" size="small">Primary</el-tag>
                <span v-else />
                <div class="flex gap-1">
                  <Can permission="hotel.update">
                    <el-button
                      v-if="!photo.is_primary"
                      size="small"
                      text
                      @click="makePrimaryPhoto(photo)"
                    >
                      Set primary
                    </el-button>
                    <el-button size="small" text type="danger" @click="removePhoto(photo)">
                      Delete
                    </el-button>
                  </Can>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="roomDialog" :title="editingRoomId ? 'Edit room' : 'Add room'" width="480px">
      <el-form label-position="top">
        <el-form-item label="Room name">
          <el-input v-model="roomForm.roomName" />
        </el-form-item>
        <el-form-item label="Room type">
          <el-input v-model="roomForm.roomType" placeholder="e.g. Deluxe" />
        </el-form-item>
        <div class="grid grid-cols-2 gap-3">
          <el-form-item label="Max guests">
            <el-input-number v-model="roomForm.maxGuests" :min="1" class="w-full" />
          </el-form-item>
          <el-form-item label="Allotment">
            <el-input-number v-model="roomForm.quantity" :min="0" class="w-full" />
          </el-form-item>
          <el-form-item label="Size (m²)">
            <el-input-number v-model="roomForm.roomSize" :min="0" class="w-full" />
          </el-form-item>
          <el-form-item label="Status">
            <el-select v-model="roomForm.status" class="w-full">
              <el-option v-for="status in ROOM_STATUSES" :key="status" :label="status" :value="status" />
            </el-select>
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="roomDialog = false">Cancel</el-button>
        <el-button type="primary" :loading="savingRoom" @click="submitRoom">Save</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="policyDialog"
      :title="editingPolicyId ? 'Edit policy' : 'Add policy'"
      width="560px"
    >
      <el-form label-position="top">
        <div class="grid grid-cols-2 gap-3">
          <el-form-item label="Type">
            <el-select v-model="policyForm.policyType" class="w-full">
              <el-option v-for="type in POLICY_TYPES" :key="type" :label="type" :value="type" />
            </el-select>
          </el-form-item>
          <el-form-item label="Display order">
            <el-input-number v-model="policyForm.displayOrder" :min="0" class="w-full" />
          </el-form-item>
        </div>
        <el-form-item label="Title">
          <el-input v-model="policyForm.title" />
        </el-form-item>
        <el-form-item label="Description">
          <el-input v-model="policyForm.description" type="textarea" :rows="4" />
        </el-form-item>
        <div class="grid grid-cols-2 gap-3">
          <el-form-item label="Icon">
            <el-input v-model="policyForm.icon" placeholder="optional" />
          </el-form-item>
          <el-form-item label="Active">
            <el-switch v-model="policyForm.isActive" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="policyDialog = false">Cancel</el-button>
        <el-button type="primary" :loading="savingPolicy" @click="submitPolicy">Save</el-button>
      </template>
    </el-dialog>
  </section>
</template>
