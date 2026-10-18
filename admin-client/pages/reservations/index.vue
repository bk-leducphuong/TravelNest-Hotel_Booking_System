<script setup lang="ts">
import {
  createBooking,
  fetchReservationBoard,
  fetchReservationCalendar,
  type BookingListItem,
  type ReservationBoard,
} from "~/services/api/bookings";
import { fetchRooms, type Room } from "~/services/api/catalog";
import {
  MONTH_KEYS,
  WEEKDAY_KEYS,
  addMonths,
  monthBounds,
  monthMatrix,
} from "~/utils/inventory";

const auth = useAuthStore();
const router = useRouter();
const { t } = useI18n();

const activeTab = ref("board");

const todayIso = () => new Date().toISOString().slice(0, 10);

// Board
const boardDate = ref(todayIso());
const board = ref<ReservationBoard | null>(null);
const loadingBoard = ref(false);

// Calendar
const now = new Date();
const year = ref(now.getUTCFullYear());
const month = ref(now.getUTCMonth() + 1);
const rooms = ref<Room[]>([]);
const calendarBookings = ref<BookingListItem[]>([]);
const loadingCalendar = ref(false);

// New booking
const createDialog = ref(false);
const saving = ref(false);
const form = reactive({
  roomId: "",
  checkInDate: todayIso(),
  checkOutDate: todayIso(),
  quantity: 1,
  numberOfGuests: 1,
  guestEmail: "",
  specialRequests: "",
  totalPrice: undefined as number | undefined,
});

const monthLabel = computed(() => `${t(MONTH_KEYS[month.value - 1])} ${year.value}`);
const weekMatrix = computed(() => monthMatrix(year.value, month.value));

const money = (value?: string | number | null, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value || 0));

const guestLabel = (booking: BookingListItem) => {
  const buyer = booking.buyer;
  if (!buyer) {
    return "—";
  }
  const name = [buyer.first_name, buyer.last_name].filter(Boolean).join(" ");
  return name || buyer.email || booking.booking_code;
};

const loadBoard = async () => {
  if (!auth.activeHotelId) {
    return;
  }
  loadingBoard.value = true;
  try {
    board.value = await fetchReservationBoard(auth.activeHotelId, { date: boardDate.value });
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loadingBoard.value = false;
  }
};

const loadCalendar = async () => {
  if (!auth.activeHotelId) {
    return;
  }
  loadingCalendar.value = true;
  try {
    const range = monthBounds(year.value, month.value);
    const [roomList, calendar] = await Promise.all([
      fetchRooms(auth.activeHotelId),
      fetchReservationCalendar(auth.activeHotelId, range),
    ]);
    rooms.value = roomList.filter((room) => room.status === "active");
    calendarBookings.value = calendar.bookings;
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    loadingCalendar.value = false;
  }
};

const changeMonth = (delta: number) => {
  const next = addMonths(year.value, month.value, delta);
  year.value = next.year;
  month.value = next.month;
  loadCalendar();
};

const bookingsFor = (roomId: string, date: string) =>
  calendarBookings.value.filter(
    (booking) =>
      booking.room_id === roomId &&
      booking.check_in_date <= date &&
      booking.check_out_date > date
  );

const openBooking = (booking: BookingListItem) => {
  router.push(`/bookings/${booking.id}`);
};

const openCreate = () => {
  Object.assign(form, {
    roomId: rooms.value[0]?.id ?? "",
    checkInDate: todayIso(),
    checkOutDate: todayIso(),
    quantity: 1,
    numberOfGuests: 1,
    guestEmail: "",
    specialRequests: "",
    totalPrice: undefined,
  });
  createDialog.value = true;
};

const submitCreate = async () => {
  if (!auth.activeHotelId) {
    return;
  }
  if (!form.roomId || !form.guestEmail.trim()) {
    ElMessage.warning(t("reservations.fieldsRequired"));
    return;
  }
  saving.value = true;
  try {
    const booking = await createBooking({
      roomId: form.roomId,
      checkInDate: form.checkInDate,
      checkOutDate: form.checkOutDate,
      quantity: form.quantity,
      numberOfGuests: form.numberOfGuests,
      guestEmail: form.guestEmail.trim(),
      specialRequests: form.specialRequests || undefined,
      totalPrice: form.totalPrice ?? undefined,
    });
    ElMessage.success(t("reservations.created"));
    createDialog.value = false;
    router.push(`/bookings/${booking.id}`);
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    saving.value = false;
  }
};

watch(
  () => auth.activeHotelId,
  () => {
    loadBoard();
    loadCalendar();
  },
  { immediate: true }
);

watch(boardDate, loadBoard);
watch(activeTab, (tab) => {
  if (tab === "calendar" && calendarBookings.value.length === 0) {
    loadCalendar();
  }
});
</script>

<template>
  <section class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
          {{ $t("reservations.title") }}
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          {{ auth.activeHotel?.name || $t("common.noHotelSelected") }}
        </p>
      </div>
      <Can permission="booking.create">
        <el-button type="primary" :disabled="!auth.activeHotelId" @click="openCreate">
          {{ $t("reservations.newBooking") }}
        </el-button>
      </Can>
    </div>

    <el-empty v-if="!auth.activeHotelId" :description="$t('reservations.noHotel')" />

    <template v-else>
      <el-tabs v-model="activeTab" type="border-card">
        <el-tab-pane :label="$t('reservations.board')" name="board">
          <div class="mb-4 flex flex-wrap items-center gap-3">
            <el-date-picker
              v-model="boardDate"
              type="date"
              value-format="YYYY-MM-DD"
              :placeholder="$t('reservations.date')"
            />
            <el-button :loading="loadingBoard" @click="loadBoard">{{ $t("common.refresh") }}</el-button>
          </div>

          <div v-loading="loadingBoard" class="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <el-card
              v-for="column in [
                { key: 'arrivals', label: $t('reservations.arrivals'), rows: board?.arrivals ?? [] },
                { key: 'departures', label: $t('reservations.departures'), rows: board?.departures ?? [] },
                { key: 'inHouse', label: $t('reservations.inHouse'), rows: board?.inHouse ?? [] },
              ]"
              :key="column.key"
              class="shadow-sm"
            >
              <template #header>
                <span class="font-medium">{{ column.label }} ({{ column.rows.length }})</span>
              </template>
              <el-empty v-if="column.rows.length === 0" :description="$t('reservations.empty')" :image-size="50" />
              <ul v-else class="divide-y divide-slate-100">
                <li
                  v-for="row in column.rows"
                  :key="row.id"
                  class="cursor-pointer py-2 hover:bg-slate-50"
                  @click="openBooking(row)"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="truncate text-sm font-medium text-slate-900">{{ guestLabel(row) }}</span>
                    <BookingStatusTag :status="row.status" />
                  </div>
                  <p class="text-xs text-slate-500">
                    {{ row.booking_code }} · {{ row.check_in_date }} → {{ row.check_out_date }} ·
                    {{ money(row.total_price, row.currency) }}
                  </p>
                </li>
              </ul>
            </el-card>
          </div>
        </el-tab-pane>

        <el-tab-pane :label="$t('reservations.calendar')" name="calendar">
          <div class="mb-3 flex items-center gap-2">
            <el-button size="small" @click="changeMonth(-1)">←</el-button>
            <span class="w-40 text-center font-medium">{{ monthLabel }}</span>
            <el-button size="small" @click="changeMonth(1)">→</el-button>
          </div>

          <div v-loading="loadingCalendar" class="overflow-x-auto">
            <table class="min-w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th
                    class="sticky left-0 z-10 min-w-[160px] border-b bg-white px-2 py-1 text-left font-medium text-slate-500"
                  >
                    {{ $t("reservations.room") }}
                  </th>
                  <th
                    v-for="weekday in WEEKDAY_KEYS"
                    :key="weekday"
                    class="border-b px-1 py-1 text-center font-medium text-slate-400"
                  >
                    {{ $t(weekday) }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(week, weekIndex) in weekMatrix" :key="weekIndex">
                  <tr v-for="room in rooms" :key="`${weekIndex}-${room.id}`" class="align-top">
                    <td class="sticky left-0 z-10 border-b bg-white px-2 py-1 font-medium text-slate-700">
                      {{ room.room_name }}
                    </td>
                    <td
                      v-for="(date, dayIndex) in week"
                      :key="`${weekIndex}-${room.id}-${dayIndex}`"
                      class="min-w-[84px] border-b border-l p-1"
                      :class="date ? 'bg-white' : 'bg-slate-50'"
                    >
                      <template v-if="date">
                        <div class="mb-0.5 text-[10px] font-semibold text-slate-400">
                          {{ Number(date.slice(-2)) }}
                        </div>
                        <button
                          v-for="booking in bookingsFor(room.id, date)"
                          :key="booking.id"
                          type="button"
                          class="mb-0.5 block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium"
                          :class="
                            booking.status === 'checked_in'
                              ? 'bg-emerald-100 text-emerald-800'
                              : booking.status === 'confirmed'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-slate-100 text-slate-600'
                          "
                          :title="`${booking.booking_code} · ${guestLabel(booking)}`"
                          @click="openBooking(booking)"
                        >
                          {{ guestLabel(booking) }}
                        </button>
                      </template>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </template>

    <el-dialog v-model="createDialog" :title="$t('reservations.newBooking')" width="560px">
      <el-form label-position="top">
        <el-form-item :label="$t('reservations.room')">
          <el-select v-model="form.roomId" class="w-full">
            <el-option v-for="room in rooms" :key="room.id" :label="room.room_name" :value="room.id" />
          </el-select>
        </el-form-item>
        <div class="grid grid-cols-2 gap-3">
          <el-form-item :label="$t('reservations.checkIn')">
            <el-date-picker v-model="form.checkInDate" type="date" value-format="YYYY-MM-DD" class="w-full" />
          </el-form-item>
          <el-form-item :label="$t('reservations.checkOut')">
            <el-date-picker v-model="form.checkOutDate" type="date" value-format="YYYY-MM-DD" class="w-full" />
          </el-form-item>
          <el-form-item :label="$t('reservations.roomsCount')">
            <el-input-number v-model="form.quantity" :min="1" class="w-full" />
          </el-form-item>
          <el-form-item :label="$t('common.guests')">
            <el-input-number v-model="form.numberOfGuests" :min="1" class="w-full" />
          </el-form-item>
        </div>
        <el-form-item :label="$t('reservations.guestEmail')">
          <el-input v-model="form.guestEmail" type="email" placeholder="guest@example.com" />
        </el-form-item>
        <el-form-item :label="$t('reservations.specialRequests')">
          <el-input v-model="form.specialRequests" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item :label="$t('reservations.totalPrice')">
          <el-input-number v-model="form.totalPrice" :min="0" :controls="false" class="w-full" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialog = false">{{ $t("common.cancel") }}</el-button>
        <el-button type="primary" :loading="saving" @click="submitCreate">{{ $t("common.save") }}</el-button>
      </template>
    </el-dialog>
  </section>
</template>
