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
  createCancellationRule,
  deleteCancellationRule,
  fetchAmenities,
  fetchCancellationRules,
  fetchCities,
  fetchCountries,
  fetchHotel,
  fetchHotelAmenities,
  fetchHotelPhotos,
  setHotelAmenities,
  setPrimaryHotelPhoto,
  updateCancellationRule,
  updateHotel,
  updatePolicy,
  updateRoom,
  uploadHotelPhoto,
  type Amenity,
  type CancellationRule,
  type City,
  type Country,
  type HotelDetail,
  type HotelPhoto,
  type HotelPolicy,
  type Room,
} from "~/services/api/catalog";

const route = useRoute();
const { t } = useI18n();
const hotelId = computed(() => String(route.params.hotelId));

const hotelStatusLabel = (status?: string) =>
  status ? t(`properties.hotelStatus.${status}`) : "";

const loading = ref(false);
const savingHotel = ref(false);
const savingRoom = ref(false);
const savingPolicy = ref(false);
const uploadingPhotos = ref(false);

const hotel = ref<HotelDetail | null>(null);
const rooms = ref<Room[]>([]);
const policies = ref<HotelPolicy[]>([]);
const photos = ref<HotelPhoto[]>([]);

const countries = ref<Country[]>([]);
const cities = ref<City[]>([]);
const loadingLocations = ref(false);

const amenities = ref<Amenity[]>([]);
const selectedAmenityIds = ref<string[]>([]);
const savingAmenities = ref(false);

const rules = ref<CancellationRule[]>([]);
const roomOptions = ref<Array<{ id: string; room_name: string }>>([]);
const ruleDialog = ref(false);
const editingRuleId = ref<string | null>(null);
const savingRule = ref(false);
const ruleForm = reactive({
  roomId: null as string | null | undefined,
  isRefundable: true,
  freeCancellationUntilHoursBeforeCheckin: undefined as number | undefined,
  refundPercentBeforeDeadline: 100,
  refundPercentAfterDeadline: 0,
  cancellationFeeType: "none" as string,
  cancellationFeeValue: undefined as number | undefined,
  isActive: true,
});

const activeTab = ref("overview");
const fileInput = ref<HTMLInputElement | null>(null);

const triggerPhotoPicker = () => fileInput.value?.click();

const hotelForm = reactive({
  name: "",
  description: "",
  address: "",
  cityId: undefined as string | undefined,
  countryId: undefined as string | undefined,
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
  hotelForm.cityId = data.city_id ?? undefined;
  hotelForm.countryId = data.country_id ?? undefined;
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

const loadCountries = async () => {
  try {
    const result = await fetchCountries({ limit: 300 });
    countries.value = result.data;
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
};

const loadCities = async () => {
  try {
    const result = await fetchCities({
      countryId: hotelForm.countryId || undefined,
      limit: 200,
    });
    cities.value = result.data;
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
};

const loadLocations = async () => {
  loadingLocations.value = true;
  try {
    await Promise.all([loadCountries(), loadCities()]);
  } finally {
    loadingLocations.value = false;
  }
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

const loadAmenities = async () => {
  try {
    const [catalog, assigned] = await Promise.all([
      fetchAmenities({ limit: 200 }),
      fetchHotelAmenities(hotelId.value),
    ]);
    amenities.value = catalog.data;
    selectedAmenityIds.value = assigned;
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
};

const saveAmenities = async () => {
  savingAmenities.value = true;
  try {
    await setHotelAmenities(hotelId.value, selectedAmenityIds.value);
    ElMessage.success(t("properties.amenitiesUpdated"));
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    savingAmenities.value = false;
  }
};

const loadRules = async () => {
  try {
    rules.value = await fetchCancellationRules(hotelId.value);
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
};

const openCreateRule = () => {
  editingRuleId.value = null;
  Object.assign(ruleForm, {
    roomId: null,
    isRefundable: true,
    freeCancellationUntilHoursBeforeCheckin: undefined,
    refundPercentBeforeDeadline: 100,
    refundPercentAfterDeadline: 0,
    cancellationFeeType: "none",
    cancellationFeeValue: undefined,
    isActive: true,
  });
  ruleDialog.value = true;
};

const openEditRule = (rule: CancellationRule) => {
  editingRuleId.value = rule.id;
  Object.assign(ruleForm, {
    roomId: rule.room_id ?? null,
    isRefundable: rule.is_refundable,
    freeCancellationUntilHoursBeforeCheckin:
      toNumberOrUndefined(rule.free_cancellation_until_hours_before_checkin),
    refundPercentBeforeDeadline: Number(rule.refund_percent_before_deadline ?? 100),
    refundPercentAfterDeadline: Number(rule.refund_percent_after_deadline ?? 0),
    cancellationFeeType: rule.cancellation_fee_type ?? "none",
    cancellationFeeValue: toNumberOrUndefined(rule.cancellation_fee_value),
    isActive: rule.is_active,
  });
  ruleDialog.value = true;
};

const submitRule = async () => {
  savingRule.value = true;
  try {
    const payload = {
      roomId: ruleForm.roomId ?? null,
      isRefundable: ruleForm.isRefundable,
      freeCancellationUntilHoursBeforeCheckin:
        ruleForm.freeCancellationUntilHoursBeforeCheckin ?? null,
      refundPercentBeforeDeadline: ruleForm.refundPercentBeforeDeadline,
      refundPercentAfterDeadline: ruleForm.refundPercentAfterDeadline,
      cancellationFeeType: ruleForm.cancellationFeeType,
      cancellationFeeValue: ruleForm.cancellationFeeValue ?? null,
      isActive: ruleForm.isActive,
    };
    if (editingRuleId.value) {
      await updateCancellationRule(hotelId.value, editingRuleId.value, payload);
      ElMessage.success(t("properties.ruleUpdated"));
    } else {
      await createCancellationRule(hotelId.value, payload);
      ElMessage.success(t("properties.ruleCreated"));
    }
    ruleDialog.value = false;
    await loadRules();
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    savingRule.value = false;
  }
};

const removeRule = async (rule: CancellationRule) => {
  try {
    await ElMessageBox.confirm(t("properties.confirmDeleteRule"), t("properties.deleteRuleTitle"), {
      type: "warning",
      confirmButtonText: t("common.delete"),
    });
  } catch {
    return;
  }
  try {
    await deleteCancellationRule(hotelId.value, rule.id);
    ElMessage.success(t("properties.ruleDeleted"));
    await loadRules();
  } catch (error) {
    ElMessage.error((error as Error).message);
  }
};

const roomName = (roomId?: string | null) =>
  roomId ? roomOptions.value.find((room) => room.id === roomId)?.room_name ?? roomId : t("properties.hotelWide");

const loadDetail = async () => {
  loading.value = true;
  try {
    const detail = await fetchHotel(hotelId.value);
    hotel.value = detail.hotel;
    rooms.value = detail.rooms;
    policies.value = detail.policies;
    roomOptions.value = detail.rooms.map((room) => ({ id: room.id, room_name: room.room_name }));
    applyHotelForm(detail.hotel);
    photos.value = await fetchHotelPhotos(hotelId.value).catch(() => []);
    await Promise.all([loadLocations(), loadAmenities(), loadRules()]);
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
      cityId: hotelForm.cityId ?? undefined,
      countryId: hotelForm.countryId ?? undefined,
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
    ElMessage.success(t("properties.toast.updated"));
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
    ElMessage.warning(t("properties.toast.roomNameRequired"));
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
      ElMessage.success(t("properties.toast.roomUpdated"));
    } else {
      await createRoom(hotelId.value, payload);
      ElMessage.success(t("properties.toast.roomCreated"));
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
      t("properties.confirm.deactivateRoom", { name: room.room_name }),
      t("properties.confirm.deactivateRoomTitle"),
      { type: "warning", confirmButtonText: t("properties.action.deactivate") }
    );
  } catch {
    return;
  }
  try {
    await deleteRoom(hotelId.value, room.id);
    ElMessage.success(t("properties.toast.roomDeactivated"));
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
    ElMessage.warning(t("properties.toast.policyFieldsRequired"));
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
      ElMessage.success(t("properties.toast.policyUpdated"));
    } else {
      await createPolicy(hotelId.value, payload);
      ElMessage.success(t("properties.toast.policyCreated"));
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
    await ElMessageBox.confirm(
      t("properties.confirm.deactivatePolicy", { name: policy.title }),
      t("properties.confirm.deactivatePolicyTitle"),
      {
        type: "warning",
        confirmButtonText: t("properties.action.deactivate"),
      }
    );
  } catch {
    return;
  }
  try {
    await deletePolicy(hotelId.value, policy.id);
    ElMessage.success(t("properties.toast.policyDeactivated"));
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
    ElMessage.success(t("properties.toast.photosUploaded", { count: files.length }));
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
    await ElMessageBox.confirm(
      t("properties.confirm.deletePhoto"),
      t("properties.confirm.deletePhotoTitle"),
      {
        type: "warning",
        confirmButtonText: t("properties.action.delete"),
      }
    );
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

watch(
  () => hotelForm.countryId,
  () => {
    loadCities();
  }
);

watch(hotelId, loadDetail, { immediate: true });
</script>

<template>
  <section v-loading="loading" class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <NuxtLink to="/properties" class="text-sm text-emerald-600 hover:underline">
          ← {{ $t("properties.title") }}
        </NuxtLink>
        <h2 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          {{ hotel?.name || $t("properties.fallbackTitle") }}
        </h2>
        <p class="text-sm text-slate-500">{{ hotelId }}</p>
      </div>
      <el-tag v-if="hotel" :type="hotel.status === 'active' ? 'success' : 'info'">
        {{ hotelStatusLabel(hotel.status) }}
      </el-tag>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane :label="$t('common.details')" name="overview">
        <el-card class="shadow-sm">
          <el-form label-position="top">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <el-form-item :label="$t('properties.form.name')">
                <el-input v-model="hotelForm.name" />
              </el-form-item>
              <el-form-item :label="$t('common.status')">
                <el-select v-model="hotelForm.status" class="w-full">
                  <el-option
                    v-for="status in HOTEL_STATUSES"
                    :key="status"
                    :label="$t('properties.hotelStatus.' + status)"
                    :value="status"
                  />
                </el-select>
              </el-form-item>
              <el-form-item :label="$t('properties.form.address')">
                <el-input v-model="hotelForm.address" />
              </el-form-item>
              <el-form-item :label="$t('properties.country')">
                <el-select
                  v-model="hotelForm.countryId"
                  :loading="loadingLocations"
                  clearable
                  filterable
                  :placeholder="$t('properties.selectCountry')"
                  class="w-full"
                >
                  <el-option
                    v-for="country in countries"
                    :key="country.id"
                    :label="country.name"
                    :value="country.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item :label="$t('properties.city')">
                <el-select
                  v-model="hotelForm.cityId"
                  :loading="loadingLocations"
                  clearable
                  filterable
                  :placeholder="$t('properties.selectCity')"
                  class="w-full"
                >
                  <el-option
                    v-for="city in cities"
                    :key="city.id"
                    :label="city.name"
                    :value="city.id"
                  />
                </el-select>
              </el-form-item>
              <el-form-item :label="$t('properties.form.phone')">
                <el-input v-model="hotelForm.phoneNumber" />
              </el-form-item>
              <el-form-item :label="$t('properties.form.checkInTime')">
                <el-input
                  v-model="hotelForm.checkInTime"
                  :placeholder="$t('properties.form.checkInTimePlaceholder')"
                />
              </el-form-item>
              <el-form-item :label="$t('properties.form.checkOutTime')">
                <el-input
                  v-model="hotelForm.checkOutTime"
                  :placeholder="$t('properties.form.checkOutTimePlaceholder')"
                />
              </el-form-item>
              <el-form-item :label="$t('properties.form.latitude')">
                <el-input-number v-model="hotelForm.latitude" :controls="false" class="w-full" />
              </el-form-item>
              <el-form-item :label="$t('properties.form.longitude')">
                <el-input-number v-model="hotelForm.longitude" :controls="false" class="w-full" />
              </el-form-item>
              <el-form-item :label="$t('properties.form.hotelClass')">
                <el-select v-model="hotelForm.hotelClass" clearable class="w-full">
                  <el-option
                    v-for="n in 5"
                    :key="n"
                    :label="$t('properties.stars', { count: n })"
                    :value="n"
                  />
                </el-select>
              </el-form-item>
              <el-form-item :label="$t('properties.form.minPrice')">
                <el-input-number v-model="hotelForm.minPrice" :min="0" :controls="false" class="w-full" />
              </el-form-item>
              <el-form-item :label="$t('properties.form.timezone')">
                <el-input
                  v-model="hotelForm.timezone"
                  :placeholder="$t('properties.form.timezonePlaceholder')"
                />
              </el-form-item>
            </div>

            <el-form-item :label="$t('properties.form.description')">
              <el-input v-model="hotelForm.description" type="textarea" :rows="3" />
            </el-form-item>
            <el-form-item :label="$t('properties.form.checkInPolicy')">
              <el-input v-model="hotelForm.checkInPolicy" type="textarea" :rows="2" />
            </el-form-item>
            <el-form-item :label="$t('properties.form.checkOutPolicy')">
              <el-input v-model="hotelForm.checkOutPolicy" type="textarea" :rows="2" />
            </el-form-item>

            <Can permission="hotel.update">
              <el-button type="primary" :loading="savingHotel" @click="saveHotel">
                {{ $t("properties.action.saveChanges") }}
              </el-button>
            </Can>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane :label="$t('properties.tab.rooms', { count: rooms.length })" name="rooms">
        <el-card class="shadow-sm">
          <div class="mb-4 flex items-center justify-between">
            <p class="text-sm text-slate-500">{{ $t("properties.rooms.hint") }}</p>
            <Can permission="room.create">
              <el-button type="primary" size="small" @click="openCreateRoom">
                {{ $t("properties.rooms.add") }}
              </el-button>
            </Can>
          </div>

          <el-empty v-if="rooms.length === 0" :description="$t('properties.rooms.empty')" />
          <el-table v-else :data="rooms" style="width: 100%">
            <el-table-column prop="room_name" :label="$t('properties.form.name')" min-width="160" />
            <el-table-column prop="room_type" :label="$t('properties.rooms.col.type')" min-width="120" />
            <el-table-column prop="max_guests" :label="$t('properties.rooms.col.guests')" width="90" />
            <el-table-column prop="quantity" :label="$t('properties.rooms.col.allotment')" width="110" />
            <el-table-column prop="status" :label="$t('common.status')" width="110" />
            <el-table-column :label="$t('common.actions')" width="250" fixed="right">
              <template #default="{ row }">
                <NuxtLink :to="`/rooms/${row.id}`">
                  <el-button size="small" type="primary" plain>{{ $t("rooms.manage") }}</el-button>
                </NuxtLink>
                <Can permission="room.update">
                  <el-button size="small" @click="openEditRoom(row)">
                    {{ $t("properties.action.edit") }}
                  </el-button>
                </Can>
                <Can permission="room.delete">
                  <el-button size="small" type="danger" plain @click="removeRoom(row)">
                    {{ $t("properties.action.deactivate") }}
                  </el-button>
                </Can>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane :label="$t('properties.tab.policies', { count: policies.length })" name="policies">
        <el-card class="shadow-sm">
          <div class="mb-4 flex items-center justify-between">
            <p class="text-sm text-slate-500">{{ $t("properties.policies.hint") }}</p>
            <Can permission="hotel.update">
              <el-button type="primary" size="small" @click="openCreatePolicy">
                {{ $t("properties.policies.add") }}
              </el-button>
            </Can>
          </div>

          <el-empty v-if="policies.length === 0" :description="$t('properties.policies.empty')" />
          <el-table v-else :data="policies" style="width: 100%">
            <el-table-column prop="policy_type" :label="$t('properties.policies.col.type')" width="140" />
            <el-table-column prop="title" :label="$t('properties.policies.col.title')" min-width="160" />
            <el-table-column prop="display_order" :label="$t('properties.policies.col.order')" width="90" />
            <el-table-column :label="$t('properties.policies.col.active')" width="100">
              <template #default="{ row }">
                <el-tag :type="row.is_active ? 'success' : 'info'" size="small">
                  {{ row.is_active ? $t("properties.active") : $t("properties.inactive") }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="$t('common.actions')" width="160" fixed="right">
              <template #default="{ row }">
                <Can permission="hotel.update">
                  <el-button size="small" @click="openEditPolicy(row)">
                    {{ $t("properties.action.edit") }}
                  </el-button>
                  <el-button size="small" type="danger" plain @click="removePolicy(row)">
                    {{ $t("properties.action.deactivate") }}
                  </el-button>
                </Can>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane :label="$t('properties.tab.photos', { count: photos.length })" name="photos">
        <el-card class="shadow-sm">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm text-slate-500">{{ $t("properties.photos.hint") }}</p>
            <Can permission="hotel.update">
              <el-button
                type="primary"
                size="small"
                :loading="uploadingPhotos"
                @click="triggerPhotoPicker"
              >
                {{ $t("properties.photos.upload") }}
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

          <el-empty v-if="photos.length === 0" :description="$t('properties.photos.empty')" />
          <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div
              v-for="photo in photos"
              :key="photo.id"
              class="overflow-hidden rounded-lg border border-slate-200"
            >
              <img :src="photo.url" alt="" class="h-32 w-full object-cover" />
              <div class="flex items-center justify-between gap-2 p-2">
                <el-tag v-if="photo.is_primary" type="success" size="small">
                  {{ $t("properties.photos.primary") }}
                </el-tag>
                <span v-else />
                <div class="flex gap-1">
                  <Can permission="hotel.update">
                    <el-button
                      v-if="!photo.is_primary"
                      size="small"
                      text
                      @click="makePrimaryPhoto(photo)"
                    >
                      {{ $t("properties.photos.setPrimary") }}
                    </el-button>
                    <el-button size="small" text type="danger" @click="removePhoto(photo)">
                      {{ $t("properties.action.delete") }}
                    </el-button>
                  </Can>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane :label="$t('properties.amenities')" name="amenities">
        <el-card class="shadow-sm">
          <p class="mb-4 text-sm text-slate-500">{{ $t("properties.amenitiesHint") }}</p>

          <el-empty v-if="amenities.length === 0" description="—" />
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
            <Can permission="hotel.update">
              <el-button type="primary" :loading="savingAmenities" @click="saveAmenities">
                {{ $t("properties.saveAmenities") }}
              </el-button>
            </Can>
          </template>
        </el-card>
      </el-tab-pane>

      <el-tab-pane :label="$t('properties.cancellationRules')" name="cancellation-rules">
        <el-card class="shadow-sm">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm text-slate-500">{{ $t("properties.cancellationRulesHint") }}</p>
            <Can permission="hotel.update">
              <el-button type="primary" size="small" @click="openCreateRule">
                {{ $t("properties.addRule") }}
              </el-button>
            </Can>
          </div>

          <el-empty v-if="rules.length === 0" :description="$t('properties.noRules')" />
          <el-table v-else :data="rules" style="width: 100%">
            <el-table-column :label="$t('properties.room')" min-width="180">
              <template #default="{ row }">{{ roomName(row.room_id) }}</template>
            </el-table-column>
            <el-table-column :label="$t('properties.refundable')" width="120">
              <template #default="{ row }">
                <el-tag :type="row.is_refundable ? 'success' : 'info'" size="small">
                  {{ row.is_refundable ? "Yes" : "No" }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              :label="$t('properties.refundBefore')"
              width="150"
              prop="refund_percent_before_deadline"
            />
            <el-table-column
              :label="$t('properties.refundAfter')"
              width="150"
              prop="refund_percent_after_deadline"
            />
            <el-table-column :label="$t('properties.active')" width="110">
              <template #default="{ row }">
                <el-tag :type="row.is_active ? 'success' : 'info'" size="small">
                  {{ row.is_active ? "Active" : "Inactive" }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="$t('common.actions')" width="180" fixed="right">
              <template #default="{ row }">
                <Can permission="hotel.update">
                  <el-button size="small" @click="openEditRule(row)">{{ $t("common.edit") }}</el-button>
                  <el-button size="small" type="danger" plain @click="removeRule(row)">
                    {{ $t("common.delete") }}
                  </el-button>
                </Can>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="roomDialog"
      :title="editingRoomId ? $t('properties.roomDialog.editTitle') : $t('properties.roomDialog.addTitle')"
      width="480px"
    >
      <el-form label-position="top">
        <el-form-item :label="$t('properties.roomDialog.name')">
          <el-input v-model="roomForm.roomName" />
        </el-form-item>
        <el-form-item :label="$t('properties.roomDialog.type')">
          <el-input
            v-model="roomForm.roomType"
            :placeholder="$t('properties.roomDialog.typePlaceholder')"
          />
        </el-form-item>
        <div class="grid grid-cols-2 gap-3">
          <el-form-item :label="$t('properties.roomDialog.maxGuests')">
            <el-input-number v-model="roomForm.maxGuests" :min="1" class="w-full" />
          </el-form-item>
          <el-form-item :label="$t('properties.rooms.col.allotment')">
            <el-input-number v-model="roomForm.quantity" :min="0" class="w-full" />
          </el-form-item>
          <el-form-item :label="$t('properties.roomDialog.size')">
            <el-input-number v-model="roomForm.roomSize" :min="0" class="w-full" />
          </el-form-item>
          <el-form-item :label="$t('common.status')">
            <el-select v-model="roomForm.status" class="w-full">
              <el-option
                v-for="status in ROOM_STATUSES"
                :key="status"
                :label="$t('properties.roomStatus.' + status)"
                :value="status"
              />
            </el-select>
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="roomDialog = false">{{ $t("common.cancel") }}</el-button>
        <el-button type="primary" :loading="savingRoom" @click="submitRoom">
          {{ $t("common.save") }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="policyDialog"
      :title="editingPolicyId ? $t('properties.policyDialog.editTitle') : $t('properties.policyDialog.addTitle')"
      width="560px"
    >
      <el-form label-position="top">
        <div class="grid grid-cols-2 gap-3">
          <el-form-item :label="$t('properties.policies.col.type')">
            <el-select v-model="policyForm.policyType" class="w-full">
              <el-option
                v-for="type in POLICY_TYPES"
                :key="type"
                :label="$t('properties.policyType.' + type)"
                :value="type"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('properties.policyDialog.displayOrder')">
            <el-input-number v-model="policyForm.displayOrder" :min="0" class="w-full" />
          </el-form-item>
        </div>
        <el-form-item :label="$t('properties.policyDialog.title')">
          <el-input v-model="policyForm.title" />
        </el-form-item>
        <el-form-item :label="$t('properties.form.description')">
          <el-input v-model="policyForm.description" type="textarea" :rows="4" />
        </el-form-item>
        <div class="grid grid-cols-2 gap-3">
          <el-form-item :label="$t('properties.policyDialog.icon')">
            <el-input v-model="policyForm.icon" :placeholder="$t('properties.optional')" />
          </el-form-item>
          <el-form-item :label="$t('properties.policyDialog.active')">
            <el-switch v-model="policyForm.isActive" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="policyDialog = false">{{ $t("common.cancel") }}</el-button>
        <el-button type="primary" :loading="savingPolicy" @click="submitPolicy">
          {{ $t("common.save") }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="ruleDialog"
      :title="editingRuleId ? $t('properties.editRule') : $t('properties.addRule')"
      width="620px"
    >
      <el-form label-position="top">
        <el-form-item :label="$t('properties.room')">
          <el-select
            v-model="ruleForm.roomId"
            clearable
            class="w-full"
            :placeholder="$t('properties.hotelWide')"
          >
            <el-option
              v-for="room in roomOptions"
              :key="room.id"
              :label="room.room_name"
              :value="room.id"
            />
          </el-select>
        </el-form-item>
        <div class="grid grid-cols-2 gap-3">
          <el-form-item :label="$t('properties.refundable')">
            <el-switch v-model="ruleForm.isRefundable" />
          </el-form-item>
          <el-form-item :label="$t('properties.active')">
            <el-switch v-model="ruleForm.isActive" />
          </el-form-item>
          <el-form-item :label="$t('properties.freeCancellationHours')">
            <el-input-number
              v-model="ruleForm.freeCancellationUntilHoursBeforeCheckin"
              :min="0"
              class="w-full"
            />
          </el-form-item>
          <el-form-item :label="$t('properties.feeType')">
            <el-select v-model="ruleForm.cancellationFeeType" class="w-full">
              <el-option label="none" value="none" />
              <el-option label="percentage" value="percentage" />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('properties.refundBefore')">
            <el-input-number
              v-model="ruleForm.refundPercentBeforeDeadline"
              :min="0"
              :max="100"
              class="w-full"
            />
          </el-form-item>
          <el-form-item :label="$t('properties.refundAfter')">
            <el-input-number
              v-model="ruleForm.refundPercentAfterDeadline"
              :min="0"
              :max="100"
              class="w-full"
            />
          </el-form-item>
          <el-form-item :label="$t('properties.feeValue')">
            <el-input-number v-model="ruleForm.cancellationFeeValue" :min="0" class="w-full" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="ruleDialog = false">{{ $t("common.cancel") }}</el-button>
        <el-button type="primary" :loading="savingRule" @click="submitRule">
          {{ $t("common.save") }}
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>
