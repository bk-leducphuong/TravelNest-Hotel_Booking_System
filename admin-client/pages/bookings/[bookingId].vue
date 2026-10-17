<script setup lang="ts">
import {
  cancelBooking,
  fetchBooking,
  updateBookingStatus,
  type BookingDetail,
} from "~/services/api/bookings";
import {
  allowedNextStatuses,
  canCancelBooking,
} from "~/utils/bookings";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const bookingId = computed(() => String(route.params.bookingId));
const loading = ref(false);
const actionLoading = ref(false);
const booking = ref<BookingDetail | null>(null);

const statusLabel = (status: string) => t(`bookings.status.${status}`);

const cancelDialog = reactive({
  visible: false,
  reason: "",
  processRefund: false,
  refundAmount: undefined as number | undefined,
});

const money = (value?: string | number | null, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value || 0));

const buyerLabel = computed(() => {
  const buyer = booking.value?.buyer;
  if (!buyer) {
    return "—";
  }
  const name = [buyer.first_name, buyer.last_name].filter(Boolean).join(" ");
  return name || buyer.email || buyer.id;
});

const statusActions = computed(() =>
  booking.value ? allowedNextStatuses(booking.value.status) : []
);
const cancellable = computed(() => (booking.value ? canCancelBooking(booking.value.status) : false));

const load = async () => {
  loading.value = true;
  try {
    booking.value = await fetchBooking(bookingId.value);
  } catch (error) {
    ElMessage.error((error as Error).message);
    booking.value = null;
  } finally {
    loading.value = false;
  }
};

const onStatus = async (status: string) => {
  actionLoading.value = true;
  try {
    await updateBookingStatus(bookingId.value, status);
    ElMessage.success(t("bookings.toast.marked", { status: statusLabel(status) }));
    await load();
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    actionLoading.value = false;
  }
};

const openCancel = () => {
  cancelDialog.visible = true;
  cancelDialog.reason = "";
  cancelDialog.processRefund = false;
  cancelDialog.refundAmount = undefined;
};

const confirmCancel = async () => {
  actionLoading.value = true;
  try {
    const result = await cancelBooking(bookingId.value, {
      reason: cancelDialog.reason || undefined,
      processRefund: cancelDialog.processRefund,
      refundAmount: cancelDialog.processRefund ? cancelDialog.refundAmount : undefined,
    });

    if (result.refundError) {
      ElMessage.warning(
        t("bookings.toast.cancelRefundFailed", { error: result.refundError })
      );
    } else {
      ElMessage.success(t("bookings.toast.cancelled"));
    }

    cancelDialog.visible = false;
    await load();
  } catch (error) {
    ElMessage.error((error as Error).message);
  } finally {
    actionLoading.value = false;
  }
};

watch(bookingId, load, { immediate: true });
</script>

<template>
  <section v-loading="loading" class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <el-button link @click="router.push('/bookings')">
          ← {{ $t("nav.bookings") }}
        </el-button>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
          {{ booking?.booking_code || $t("bookings.fallbackTitle") }}
        </h2>
        <BookingStatusTag v-if="booking" :status="booking.status" />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <template v-if="booking">
          <Can permission="booking.manage">
            <el-button
              v-for="status in statusActions"
              :key="status"
              :loading="actionLoading"
              @click="onStatus(status)"
            >
              {{ $t("bookings.action.mark", { status: statusLabel(status) }) }}
            </el-button>
          </Can>
          <Can permission="booking.cancel">
            <el-button v-if="cancellable" type="danger" plain @click="openCancel">
              {{ $t("bookings.action.cancel") }}
            </el-button>
          </Can>
        </template>
      </div>
    </div>

    <el-empty
      v-if="!loading && !booking"
      :description="$t('bookings.empty.detail')"
    />

    <template v-if="booking">
      <el-card class="shadow-sm">
        <template #header>
          <span class="font-medium">{{ $t("bookings.section.overview") }}</span>
        </template>
        <el-descriptions :column="3" border>
          <el-descriptions-item :label="$t('bookings.col.guest')">{{ buyerLabel }}</el-descriptions-item>
          <el-descriptions-item :label="$t('bookings.col.hotel')">
            {{ booking.hotel?.name || "—" }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('bookings.col.bookedOn')">
            {{ new Date(booking.created_at).toLocaleString() }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('bookings.col.checkIn')">
            {{ booking.check_in_date }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('bookings.col.checkOut')">
            {{ booking.check_out_date }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('bookings.col.guestsRooms')">
            {{ booking.number_of_guests }} / {{ booking.quantity }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('common.total')">
            {{ money(booking.total_price, booking.currency) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('bookings.col.currency')">
            {{ booking.currency }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('bookings.col.specialRequests')">
            {{ booking.special_requests || "—" }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card v-if="booking.bookingRooms?.length" class="shadow-sm">
        <template #header>
          <span class="font-medium">{{ $t("bookings.section.rooms") }}</span>
        </template>
        <el-table :data="booking.bookingRooms" row-key="id">
          <el-table-column :label="$t('bookings.col.room')">
            <template #default="{ row }">{{ row.room?.room_name || row.room_id }}</template>
          </el-table-column>
          <el-table-column prop="quantity" :label="$t('bookings.col.quantity')" width="120" />
          <el-table-column :label="$t('bookings.col.lineTotal')" width="160" align="right">
            <template #default="{ row }">{{ money(row.total_price, booking.currency) }}</template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card v-if="booking.transaction" class="shadow-sm">
        <template #header>
          <span class="font-medium">{{ $t("bookings.section.payment") }}</span>
        </template>
        <el-descriptions :column="3" border class="mb-4">
          <el-descriptions-item :label="$t('bookings.col.transactionStatus')">
            {{ booking.transaction.status }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('bookings.col.amount')">
            {{ money(booking.transaction.amount, booking.transaction.currency) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('bookings.col.type')">
            {{ booking.transaction.transaction_type }}
          </el-descriptions-item>
        </el-descriptions>

        <template v-if="booking.transaction.payments?.length">
          <p class="mb-2 text-sm font-medium text-slate-600">
            {{ $t("bookings.section.payments") }}
          </p>
          <el-table :data="booking.transaction.payments" row-key="id" class="mb-4">
            <el-table-column prop="payment_status" :label="$t('common.status')" />
            <el-table-column :label="$t('bookings.col.amount')" align="right">
              <template #default="{ row }">{{ money(row.amount, row.currency) }}</template>
            </el-table-column>
            <el-table-column :label="$t('bookings.col.card')" width="160">
              <template #default="{ row }">
                {{ row.card_brand ? `${row.card_brand} •••• ${row.card_last4}` : "—" }}
              </template>
            </el-table-column>
          </el-table>
        </template>

        <template v-if="booking.transaction.refunds?.length">
          <p class="mb-2 text-sm font-medium text-slate-600">
            {{ $t("bookings.section.refunds") }}
          </p>
          <el-table :data="booking.transaction.refunds" row-key="id">
            <el-table-column prop="status" :label="$t('common.status')" />
            <el-table-column :label="$t('bookings.col.amount')" align="right">
              <template #default="{ row }">{{ money(row.amount, row.currency) }}</template>
            </el-table-column>
            <el-table-column prop="reason" :label="$t('bookings.col.reason')" />
          </el-table>
        </template>
      </el-card>
    </template>

    <el-dialog
      v-model="cancelDialog.visible"
      :title="$t('bookings.dialog.cancelTitle')"
      width="480px"
    >
      <el-form label-position="top">
        <el-form-item :label="$t('bookings.dialog.reason')">
          <el-input
            v-model="cancelDialog.reason"
            type="textarea"
            :rows="3"
            :placeholder="$t('bookings.dialog.optional')"
          />
        </el-form-item>
        <el-form-item :label="$t('bookings.dialog.processRefund')">
          <el-switch v-model="cancelDialog.processRefund" />
        </el-form-item>
        <el-form-item
          v-if="cancelDialog.processRefund"
          :label="$t('bookings.dialog.refundAmount')"
        >
          <el-input-number
            v-model="cancelDialog.refundAmount"
            :min="0"
            :controls="false"
            :placeholder="$t('bookings.dialog.fullBalance')"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="cancelDialog.visible = false">
          {{ $t("bookings.dialog.keep") }}
        </el-button>
        <el-button type="danger" :loading="actionLoading" @click="confirmCancel">
          {{ $t("bookings.dialog.confirmCancel") }}
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>
