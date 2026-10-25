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
const { can } = usePermissions();
const boardRequests = useRequestVersion();
const calendarRequests = useRequestVersion();
const boardError = ref("");
const calendarError = ref("");
const router = useRouter();
const { t } = useI18n();

const activeTab = ref("board");

const todayIso = () => new Date().toISOString().slice(0, 10);
const tomorrowIso = () =>
  new Date(Date.now() + 86400000).toISOString().slice(0, 10);

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
  checkOutDate: tomorrowIso(),
  quantity: 1,
  numberOfGuests: 1,
  guestEmail: "",
  specialRequests: "",
  totalPrice: undefined as number | undefined,
});

const monthLabel = computed(
  () => `${t(MONTH_KEYS[month.value - 1] ?? "inventory.month.1")} ${year.value}`
);
const weekMatrix = computed(() => monthMatrix(year.value, month.value));

const money = (value?: string | number | null, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    Number(value || 0)
  );

const guestLabel = (booking: BookingListItem) => {
  const buyer = booking.buyer;
  if (!buyer) {
    return "—";
  }
  const name = [buyer.first_name, buyer.last_name].filter(Boolean).join(" ");
  return name || buyer.email || booking.booking_code;
};

const loadBoard = async () => {
  const current = boardRequests.begin();
  board.value = null;
  boardError.value = "";
  loadingBoard.value = false;
  if (!auth.activeHotelId || !can("booking.read")) {
    return;
  }
  loadingBoard.value = true;
  try {
    const result = await fetchReservationBoard(auth.activeHotelId, {
      date: boardDate.value,
    });
    if (current()) board.value = result;
  } catch (error) {
    if (current()) boardError.value = (error as Error).message;
  } finally {
    if (current()) loadingBoard.value = false;
  }
};

const loadCalendar = async () => {
  const current = calendarRequests.begin();
  calendarBookings.value = [];
  calendarError.value = "";
  loadingCalendar.value = false;
  if (!auth.activeHotelId || !can("booking.read")) {
    return;
  }
  loadingCalendar.value = true;
  try {
    const range = monthBounds(year.value, month.value);
    const [roomList, calendar] = await Promise.all([
      can("room.read")
        ? fetchRooms(auth.activeHotelId)
        : Promise.resolve([] as Room[]),
      fetchReservationCalendar(auth.activeHotelId, range),
    ]);
    if (!current()) return;
    rooms.value = roomList.filter((room) => room.status === "active");
    calendarBookings.value = calendar.bookings;
  } catch (error) {
    if (current()) calendarError.value = (error as Error).message;
  } finally {
    if (current()) loadingCalendar.value = false;
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
    checkOutDate: tomorrowIso(),
    quantity: 1,
    numberOfGuests: 1,
    guestEmail: "",
    specialRequests: "",
    totalPrice: undefined,
  });
  createDialog.value = true;
};

const submitCreate = async () => {
  if (!auth.activeHotelId || saving.value || !can("booking.create")) {
    return;
  }
  if (!form.roomId || !form.guestEmail.trim()) {
    ElMessage.warning(t("reservations.fieldsRequired"));
    return;
  }
  if (form.checkOutDate <= form.checkInDate) {
    ElMessage.warning(t("reservations.invalidStay"));
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
    saving.value = false;
    router.push(`/bookings/${booking.id}`);
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    saving.value = false;
  }
};

watch(
  [() => auth.activeHotelId, () => can("booking.read")],
  () => {
    createDialog.value = false;
    rooms.value = [];
    loadBoard();
    loadCalendar();
  },
  { immediate: true }
);

useEditorGuard(
  "reservation-create",
  computed(() => createDialog.value),
  saving
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
    <UiPageHeader
      :title="$t('reservations.title')"
      :subtitle="auth.activeHotel?.name || $t('common.noHotelSelected')"
      ><template #actions
        ><Can permission="booking.create">
          <el-button
            type="primary"
            :disabled="!auth.activeHotelId"
            @click="openCreate"
          >
            {{ $t("reservations.newBooking") }}
          </el-button>
        </Can></template
      ></UiPageHeader
    >

    <UiEmptyState
      v-if="!can('booking.read')"
      :title="$t('editor.forbidden')"
    /><el-empty
      v-else-if="!auth.activeHotelId"
      :description="$t('reservations.noHotel')"
    />

    <template v-else>
      <UiSegmentedControl
        v-model="activeTab"
        :label="$t('reservations.title')"
        :options="[
          { value: 'board', label: $t('reservations.board') },
          { value: 'calendar', label: $t('reservations.calendar') },
        ]"
      />
      <div class="space-y-6">
        <section v-if="activeTab === 'board'" class="space-y-4">
          <el-alert
            v-if="boardError"
            :title="boardError"
            type="error"
            :closable="false"
            show-icon
          />
          <div class="mb-4 flex flex-wrap items-center gap-3">
            <el-date-picker
              v-model="boardDate"
              type="date"
              value-format="YYYY-MM-DD"
              :aria-label="$t('reservations.date')"
              :placeholder="$t('reservations.date')"
            />
            <el-button :loading="loadingBoard" @click="loadBoard">{{
              $t("common.refresh")
            }}</el-button>
          </div>

          <div
            v-if="!boardError"
            v-loading="loadingBoard"
            class="grid grid-cols-1 gap-4 lg:grid-cols-3"
          >
            <UiSectionCard
              v-for="column in [
                {
                  key: 'arrivals',
                  label: $t('reservations.arrivals'),
                  rows: board?.arrivals ?? [],
                },
                {
                  key: 'departures',
                  label: $t('reservations.departures'),
                  rows: board?.departures ?? [],
                },
                {
                  key: 'inHouse',
                  label: $t('reservations.inHouse'),
                  rows: board?.inHouse ?? [],
                },
              ]"
              :key="column.key"
            >
              <template #header>
                <span class="font-medium"
                  >{{ column.label }} ({{ column.rows.length }})</span
                >
              </template>
              <el-empty
                v-if="column.rows.length === 0"
                :description="$t('reservations.empty')"
                :image-size="50"
              />
              <ul v-else class="divide-y divide-slate-100">
                <li v-for="row in column.rows" :key="row.id" class="py-3">
                  <div class="flex items-center justify-between gap-2">
                    <span class="truncate text-sm font-medium text-ink"
                      ><NuxtLink :to="`/bookings/${row.id}`">{{
                        guestLabel(row)
                      }}</NuxtLink></span
                    >
                    <BookingStatusTag :status="row.status" />
                  </div>
                  <p class="text-xs text-muted">
                    {{ row.booking_code }} · {{ row.check_in_date }} →
                    {{ row.check_out_date }} ·
                    {{ money(row.total_price, row.currency) }}
                  </p>
                </li>
              </ul>
            </UiSectionCard>
          </div>
        </section>

        <UiSectionCard v-else :title="$t('reservations.calendar')"
          ><el-alert
            v-if="calendarError"
            :title="calendarError"
            type="error"
            :closable="false"
            show-icon
          />
          <p v-if="!can('room.read')" class="text-sm text-muted">
            {{ $t("reservations.roomPermission") }}
          </p>
          <div class="mb-3 flex items-center gap-2">
            <el-button
              size="small"
              :aria-label="$t('calendar.previous')"
              @click="changeMonth(-1)"
              >←</el-button
            >
            <span class="w-40 text-center font-medium">{{ monthLabel }}</span>
            <el-button
              size="small"
              :aria-label="$t('calendar.next')"
              @click="changeMonth(1)"
              >→</el-button
            >
          </div>

          <div
            v-if="!calendarError"
            v-loading="loadingCalendar"
            class="tn-table-region"
            role="region"
            :aria-label="$t('reservations.calendar')"
            tabindex="0"
          >
            <table class="min-w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th
                    class="sticky left-0 z-10 min-w-[160px] border-b bg-white px-2 py-1 text-left font-medium text-muted"
                  >
                    {{ $t("reservations.room") }}
                  </th>
                  <th
                    v-for="weekday in WEEKDAY_KEYS"
                    :key="weekday"
                    class="border-b bg-soft px-2 py-3 text-center font-medium text-muted"
                  >
                    {{ $t(weekday) }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <template
                  v-for="(week, weekIndex) in weekMatrix"
                  :key="weekIndex"
                >
                  <tr
                    v-for="room in rooms"
                    :key="`${weekIndex}-${room.id}`"
                    class="align-top"
                  >
                    <td
                      class="sticky left-0 z-10 border-b bg-white px-2 py-1 font-medium text-ink"
                    >
                      {{ room.room_name }}
                    </td>
                    <td
                      v-for="(date, dayIndex) in week"
                      :key="`${weekIndex}-${room.id}-${dayIndex}`"
                      class="min-w-[84px] border-b border-l p-1"
                      :class="
                        date === todayIso()
                          ? 'bg-soft'
                          : date
                            ? 'bg-white'
                            : 'bg-slate-50'
                      "
                    >
                      <template v-if="date">
                        <div
                          class="mb-0.5 text-[10px] font-semibold text-muted"
                        >
                          {{ Number(date.slice(-2)) }}
                        </div>
                        <button
                          v-for="booking in bookingsFor(room.id, date)"
                          :key="booking.id"
                          type="button"
                          class="mb-0.5 block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium"
                          :class="
                            booking.status === 'checked_in'
                              ? 'bg-soft text-brand'
                              : booking.status === 'confirmed'
                                ? 'bg-blue-50 text-brand'
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
        </UiSectionCard>
      </div>
    </template>

    <el-dialog
      v-model="createDialog"
      :title="$t('reservations.newBooking')"
      width="560px"
    >
      <el-form label-position="top" :disabled="saving">
        <el-form-item :label="$t('reservations.room')">
          <el-select v-model="form.roomId" class="w-full">
            <el-option
              v-for="room in rooms"
              :key="room.id"
              :label="room.room_name"
              :value="room.id"
            />
          </el-select>
        </el-form-item>
        <div class="grid gap-3 sm:grid-cols-2">
          <el-form-item :label="$t('reservations.checkIn')">
            <el-date-picker
              v-model="form.checkInDate"
              type="date"
              value-format="YYYY-MM-DD"
              class="w-full"
            />
          </el-form-item>
          <el-form-item :label="$t('reservations.checkOut')">
            <el-date-picker
              v-model="form.checkOutDate"
              type="date"
              value-format="YYYY-MM-DD"
              class="w-full"
            />
          </el-form-item>
          <el-form-item :label="$t('reservations.roomsCount')">
            <el-input-number v-model="form.quantity" :min="1" class="w-full" />
          </el-form-item>
          <el-form-item :label="$t('common.guests')">
            <el-input-number
              v-model="form.numberOfGuests"
              :min="1"
              class="w-full"
            />
          </el-form-item>
        </div>
        <el-form-item :label="$t('reservations.guestEmail')">
          <el-input
            v-model="form.guestEmail"
            type="email"
            placeholder="guest@example.com"
          />
        </el-form-item>
        <el-form-item :label="$t('reservations.specialRequests')">
          <el-input v-model="form.specialRequests" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item :label="$t('reservations.totalPrice')">
          <el-input-number
            v-model="form.totalPrice"
            :min="0"
            :controls="false"
            class="w-full"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialog = false">{{
          $t("common.cancel")
        }}</el-button>
        <el-button type="primary" :loading="saving" @click="submitCreate">{{
          $t("common.save")
        }}</el-button>
      </template>
    </el-dialog>
  </section>
</template>
