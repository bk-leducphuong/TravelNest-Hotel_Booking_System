<script setup lang="ts">
import {
  fetchHotelRooms,
  fetchRoomInventory,
  updateRoomInventory,
  type HotelRoomInventory,
  type InventoryDay,
} from "~/services/api/inventory";
import {
  MONTH_LABELS,
  WEEKDAY_LABELS,
  addMonths,
  inventoryStatusLabel,
  inventoryStatusTagType,
  inventoryStatusTextClass,
  monthBounds,
  monthMatrix,
} from "~/utils/inventory";

const auth = useAuthStore();

const today = new Date();
const year = ref(today.getUTCFullYear());
const month = ref(today.getUTCMonth() + 1);

const rooms = ref<HotelRoomInventory[]>([]);
const selectedRoomId = ref<string | null>(null);
const days = ref<InventoryDay[]>([]);
const selectedDates = ref<Set<string>>(new Set());

const loadingRooms = ref(false);
const loadingDays = ref(false);
const saving = ref(false);

const bulk = reactive({
  pricePerNight: undefined as number | undefined,
  totalRooms: undefined as number | undefined,
  status: "" as string,
  reason: "",
});

const STATUS_LEGEND = ["open", "close", "sold_out", "maintenance"];

const monthLabel = computed(() => `${MONTH_LABELS[month.value - 1]} ${year.value}`);
const range = computed(() => monthBounds(year.value, month.value));
const selectedRoom = computed(
  () => rooms.value.find((room) => room.roomId === selectedRoomId.value) ?? null
);
const selectedCount = computed(() => selectedDates.value.size);
const roomOptions = computed(() =>
  rooms.value.map((room) => ({ value: room.roomId, label: room.roomName }))
);

const daysByDate = computed(() => {
  const map = new Map<string, InventoryDay>();
  days.value.forEach((day) => map.set(day.date, day));
  return map;
});

interface CalendarCell {
  key: string;
  date: string | null;
  day: InventoryDay | null;
}

const calendar = computed<CalendarCell[][]>(() =>
  monthMatrix(year.value, month.value).map((week, weekIndex) =>
    week.map((date, dayIndex) => ({
      key: date || `blank-${weekIndex}-${dayIndex}`,
      date,
      day: date ? (daysByDate.value.get(date) ?? null) : null,
    }))
  )
);

const money = (value?: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const isSelected = (date: string) => selectedDates.value.has(date);

const toggleDate = (date: string) => {
  const next = new Set(selectedDates.value);
  if (next.has(date)) {
    next.delete(date);
  } else {
    next.add(date);
  }
  selectedDates.value = next;
};

const clearSelection = () => {
  selectedDates.value = new Set();
};

const selectWholeMonth = () => {
  const next = new Set<string>();
  calendar.value.flat().forEach((cell) => {
    if (cell.date) {
      next.add(cell.date);
    }
  });
  selectedDates.value = next;
};

const loadRooms = async () => {
  if (!auth.activeHotelId) {
    return;
  }
  loadingRooms.value = true;
  try {
    const result = await fetchHotelRooms(auth.activeHotelId, range.value);
    rooms.value = result.rooms;
    if (!selectedRoomId.value || !result.rooms.some((r) => r.roomId === selectedRoomId.value)) {
      selectedRoomId.value = result.rooms[0]?.roomId ?? null;
    }
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loadingRooms.value = false;
  }
};

const loadDays = async () => {
  if (!selectedRoomId.value) {
    days.value = [];
    return;
  }
  loadingDays.value = true;
  try {
    const result = await fetchRoomInventory(selectedRoomId.value, range.value);
    days.value = result.days;
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loadingDays.value = false;
  }
};

const changeMonth = (delta: number) => {
  const next = addMonths(year.value, month.value, delta);
  year.value = next.year;
  month.value = next.month;
  clearSelection();
};

const buildEntries = (overrides: Record<string, unknown>) =>
  Array.from(selectedDates.value).map((date) => ({ date, ...overrides }));

const applyChanges = async (overrides?: Record<string, unknown>) => {
  if (!selectedRoomId.value) {
    return;
  }
  if (selectedCount.value === 0) {
    ElMessage.warning("Select at least one date first.");
    return;
  }

  const changes: Record<string, unknown> = { ...(overrides ?? {}) };
  if (!overrides) {
    if (bulk.pricePerNight !== undefined && bulk.pricePerNight !== null) {
      changes.pricePerNight = bulk.pricePerNight;
    }
    if (bulk.totalRooms !== undefined && bulk.totalRooms !== null) {
      changes.totalRooms = bulk.totalRooms;
    }
    if (bulk.status) {
      changes.status = bulk.status;
    }
  }

  if (Object.keys(changes).length === 0) {
    ElMessage.warning("Nothing to update.");
    return;
  }

  saving.value = true;
  try {
    const result = await updateRoomInventory(selectedRoomId.value, {
      entries: buildEntries(changes),
      reason: bulk.reason || undefined,
    });
    ElMessage.success(`Updated ${result.created + result.updated} date(s).`);
    clearSelection();
    bulk.pricePerNight = undefined;
    bulk.totalRooms = undefined;
    bulk.status = "";
    bulk.reason = "";
    await Promise.all([loadDays(), loadRooms()]);
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    saving.value = false;
  }
};

watch(
  () => auth.activeHotelId,
  () => {
    selectedRoomId.value = null;
    clearSelection();
    loadRooms();
  },
  { immediate: true }
);

watch([selectedRoomId, () => range.value.startDate], () => {
  loadDays();
});
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Availability</h2>
        <p class="mt-1 text-sm text-slate-500">{{ auth.activeHotel?.name || "No hotel selected" }}</p>
      </div>
      <div class="flex items-center gap-2">
        <el-button :disabled="!auth.activeHotelId" @click="changeMonth(-1)">←</el-button>
        <span class="w-40 text-center font-medium">{{ monthLabel }}</span>
        <el-button :disabled="!auth.activeHotelId" @click="changeMonth(1)">→</el-button>
      </div>
    </div>

    <el-empty v-if="!auth.activeHotelId" description="Select a hotel to manage availability." />

    <template v-else>
      <div class="flex flex-wrap items-center gap-3">
        <span class="text-sm font-medium text-slate-500">Room</span>
        <el-select
          v-model="selectedRoomId"
          :loading="loadingRooms"
          placeholder="Select a room"
          class="w-64"
        >
          <el-option
            v-for="option in roomOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </div>

      <el-card v-if="selectedRoom" class="shadow-sm">
        <div class="flex flex-wrap items-center gap-6 text-sm text-slate-600">
          <span class="font-medium text-slate-900">{{ selectedRoom.roomName }}</span>
          <span>Allotment: {{ selectedRoom.quantity }}</span>
          <template v-if="selectedRoom.inventory">
            <span>Available: {{ selectedRoom.inventory.availableRooms }}</span>
            <span>Booked: {{ selectedRoom.inventory.bookedRooms }}</span>
            <span>Held: {{ selectedRoom.inventory.heldRooms }}</span>
            <span>Avg price: {{ money(selectedRoom.inventory.avgPrice) }}</span>
          </template>
          <el-tag v-else type="info">No inventory for this month</el-tag>
        </div>
      </el-card>

      <el-card v-loading="loadingDays" class="shadow-sm">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <el-button size="small" @click="selectWholeMonth">Select month</el-button>
            <el-button size="small" :disabled="selectedCount === 0" @click="clearSelection">
              Clear ({{ selectedCount }})
            </el-button>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <el-tag
              v-for="status in STATUS_LEGEND"
              :key="status"
              :type="inventoryStatusTagType(status)"
              size="small"
            >
              {{ inventoryStatusLabel(status) }}
            </el-tag>
          </div>
        </div>

        <div class="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
          <span v-for="weekday in WEEKDAY_LABELS" :key="weekday">{{ weekday }}</span>
        </div>

        <div class="mt-1 space-y-1">
          <div
            v-for="(week, weekIndex) in calendar"
            :key="weekIndex"
            class="grid grid-cols-7 gap-1"
          >
            <button
              v-for="cell in week"
              :key="cell.key"
              type="button"
              :disabled="!cell.date"
              class="min-h-[76px] rounded-lg border p-1.5 text-left transition-colors"
              :class="[
                cell.date ? 'cursor-pointer hover:border-emerald-400' : 'invisible',
                cell.date && isSelected(cell.date)
                  ? 'border-emerald-500 ring-2 ring-emerald-200'
                  : 'border-slate-200',
                cell.day?.status === 'close' ? 'bg-rose-50' : 'bg-white',
              ]"
              @click="cell.date && toggleDate(cell.date)"
            >
              <template v-if="cell.date">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-semibold text-slate-700">
                    {{ Number(cell.date.slice(-2)) }}
                  </span>
                  <span
                    v-if="cell.day"
                    class="text-[10px] font-medium"
                    :class="inventoryStatusTextClass(cell.day.status)"
                  >
                    {{ inventoryStatusLabel(cell.day.status) }}
                  </span>
                </div>
                <template v-if="cell.day">
                  <div class="mt-1 text-[11px] text-slate-600">
                    {{ money(cell.day.pricePerNight) }}
                  </div>
                  <div class="text-[11px] text-slate-400">
                    {{ cell.day.availableRooms }}/{{ cell.day.totalRooms }} left
                  </div>
                </template>
                <div v-else class="mt-1 text-[11px] text-slate-300">No inventory</div>
              </template>
            </button>
          </div>
        </div>
      </el-card>

      <Can permission="room.manage_inventory">
        <el-card class="shadow-sm">
          <template #header>
            <span class="font-medium">Bulk update ({{ selectedCount }} selected)</span>
          </template>

          <div class="flex flex-wrap items-end gap-3">
            <div>
              <p class="mb-1 text-xs text-slate-500">Price / night</p>
              <el-input-number v-model="bulk.pricePerNight" :min="0" :controls="false" class="w-32" />
            </div>
            <div>
              <p class="mb-1 text-xs text-slate-500">Allotment</p>
              <el-input-number v-model="bulk.totalRooms" :min="0" :controls="false" class="w-32" />
            </div>
            <div>
              <p class="mb-1 text-xs text-slate-500">Status</p>
              <el-select v-model="bulk.status" placeholder="Unchanged" clearable class="w-40">
                <el-option label="Open" value="open" />
                <el-option label="Closed (blocked)" value="close" />
                <el-option label="Sold out" value="sold_out" />
                <el-option label="Maintenance" value="maintenance" />
              </el-select>
            </div>
            <div class="min-w-[200px] flex-1">
              <p class="mb-1 text-xs text-slate-500">Reason (audit)</p>
              <el-input v-model="bulk.reason" placeholder="Optional" />
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <el-button
              type="primary"
              :loading="saving"
              :disabled="selectedCount === 0"
              @click="applyChanges()"
            >
              Apply changes
            </el-button>
            <el-button
              type="danger"
              plain
              :loading="saving"
              :disabled="selectedCount === 0"
              @click="applyChanges({ status: 'close' })"
            >
              Block dates
            </el-button>
            <el-button
              :loading="saving"
              :disabled="selectedCount === 0"
              @click="applyChanges({ status: 'open' })"
            >
              Unblock dates
            </el-button>
          </div>
        </el-card>
      </Can>
    </template>
  </section>
</template>
