import { apiFetch } from "~/services/http";

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
}

export interface BookingBuyer {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

export interface BookingRoomRef {
  id: string;
  room_name?: string | null;
}

export interface BookingHotelRef {
  id: string;
  name?: string | null;
}

export interface BookingListItem {
  id: string;
  booking_code: string;
  status: string;
  check_in_date: string;
  check_out_date: string;
  number_of_guests: number;
  quantity: number;
  total_price: string;
  currency: string;
  created_at: string;
  room_id?: string | null;
  buyer?: BookingBuyer | null;
  room?: BookingRoomRef | null;
  hotel?: BookingHotelRef | null;
}

export interface BookingRoomLine {
  id: string;
  room_id: string;
  quantity: number;
  subtotal?: string;
  total_price?: string;
  room?: BookingRoomRef | null;
}

export interface BookingPayment {
  id: string;
  payment_status: string;
  amount: string;
  currency: string;
  card_brand?: string | null;
  card_last4?: string | null;
}

export interface BookingRefund {
  id: string;
  amount: string;
  currency: string;
  status: string;
  reason: string;
  processed_at?: string | null;
}

export interface BookingTransaction {
  id: string;
  status: string;
  amount: string;
  currency: string;
  transaction_type: string;
  stripe_charge_id?: string | null;
  payments?: BookingPayment[];
  refunds?: BookingRefund[];
}

export interface BookingDetail extends BookingListItem {
  special_requests?: string | null;
  guest_details?: Record<string, unknown> | null;
  price_breakdown?: Record<string, unknown> | null;
  bookingRooms?: BookingRoomLine[];
  transaction?: BookingTransaction | null;
}

export interface BookingListFilters {
  status?: string;
  bookingCode?: string;
  roomId?: string;
  buyerId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface BookingStats {
  hotelId: string;
  total: number;
  byStatus: Record<string, number>;
  arrivalsToday: number;
  departuresToday: number;
}

export interface StatusUpdateResult {
  bookingId: string;
  previousStatus: string;
  status: string;
}

export interface CancelBookingResult {
  bookingId: string;
  previousStatus: string;
  status: string;
  inventoryReleased: boolean;
  refund: unknown | null;
  refundError: string | null;
}

function toQuery(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchBookingStats(hotelId: string): Promise<BookingStats> {
  const response = await apiFetch<{ data: BookingStats }>(
    `/admin/bookings/hotels/${encodeURIComponent(hotelId)}/stats`
  );
  return response.data;
}

export async function fetchBookings(
  filters: BookingListFilters = {}
): Promise<{ data: BookingListItem[]; meta: PaginatedMeta }> {
  const response = await apiFetch<{ data: BookingListItem[]; meta: PaginatedMeta }>(
    `/admin/bookings${toQuery(filters)}`
  );
  return { data: response.data, meta: response.meta };
}

export async function fetchBooking(bookingId: string): Promise<BookingDetail> {
  const response = await apiFetch<{ data: BookingDetail }>(
    `/admin/bookings/${encodeURIComponent(bookingId)}`
  );
  return response.data;
}

export async function updateBookingStatus(
  bookingId: string,
  status: string
): Promise<StatusUpdateResult> {
  const response = await apiFetch<{ data: StatusUpdateResult }>(
    `/admin/bookings/${encodeURIComponent(bookingId)}/status`,
    { method: "PATCH", body: { status } }
  );
  return response.data;
}

export async function cancelBooking(
  bookingId: string,
  payload: { reason?: string; processRefund?: boolean; refundAmount?: number }
): Promise<CancelBookingResult> {
  const response = await apiFetch<{ data: CancelBookingResult }>(
    `/admin/bookings/${encodeURIComponent(bookingId)}/cancel`,
    { method: "POST", body: payload }
  );
  return response.data;
}
