import { apiFetch } from "~/services/http";

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
}

export interface PaymentSummary {
  hotelId: string;
  totalTransactions: number;
  byStatus: Record<string, number>;
  grossAmount: number;
  refundedAmount: number;
  netAmount: number;
}

export interface TransactionBookingRef {
  id: string;
  booking_code?: string | null;
  status?: string | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
}

export interface TransactionHotelRef {
  id: string;
  name?: string | null;
}

export interface TransactionBuyerRef {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

export interface TransactionPayment {
  id: string;
  payment_status: string;
  amount: string;
  currency: string;
  card_brand?: string | null;
  card_last4?: string | null;
  paid_at?: string | null;
}

export interface TransactionRefund {
  id: string;
  amount: string;
  currency: string;
  status: string;
  reason: string;
  provider_refund_id?: string | null;
  processed_at?: string | null;
}

export interface TransactionListItem {
  id: string;
  booking_id?: string | null;
  buyer_id: string;
  hotel_id: string;
  amount: string;
  currency: string;
  status: string;
  transaction_type: string;
  payment_method?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_charge_id?: string | null;
  created_at: string;
  completed_at?: string | null;
  booking?: TransactionBookingRef | null;
  hotel?: TransactionHotelRef | null;
}

export interface TransactionDetail extends TransactionListItem {
  failure_code?: string | null;
  failure_message?: string | null;
  payments?: TransactionPayment[];
  refunds?: TransactionRefund[];
  transaction_buyer?: TransactionBuyerRef | null;
}

export interface RefundTransactionRef {
  id: string;
  booking_id?: string | null;
  amount: string;
  currency: string;
  status: string;
  transaction_type: string;
  stripe_charge_id?: string | null;
}

export interface RefundListItem {
  id: string;
  booking_id: string;
  transaction_id: string;
  amount: string;
  currency: string;
  status: string;
  reason: string;
  provider_refund_id?: string | null;
  requested_at: string;
  processed_at?: string | null;
  failure_code?: string | null;
  failure_message?: string | null;
  transaction?: RefundTransactionRef | null;
  booking?: TransactionBookingRef | null;
  hotel?: TransactionHotelRef | null;
  buyer?: TransactionBuyerRef | null;
}

export interface InitiateRefundPayload {
  amount?: number;
  reason?: string;
}

export interface InitiateRefundResult {
  refundId: string;
  providerRefundId?: string;
  status: string;
  amount: number;
  currency: string;
  transactionStatus: string;
}

export interface TransactionFilters {
  status?: string;
  transactionType?: string;
  bookingId?: string;
  buyerId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface RefundFilters {
  status?: string;
  transactionId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
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

export async function fetchPaymentSummary(hotelId: string): Promise<PaymentSummary> {
  const response = await apiFetch<{ data: PaymentSummary }>(
    `/admin/payments/hotels/${encodeURIComponent(hotelId)}/summary`
  );
  return response.data;
}

export async function fetchTransactions(
  filters: TransactionFilters = {}
): Promise<{ data: TransactionListItem[]; meta: PaginatedMeta }> {
  const response = await apiFetch<{ data: TransactionListItem[]; meta: PaginatedMeta }>(
    `/admin/payments/transactions${toQuery(filters)}`
  );
  return { data: response.data, meta: response.meta };
}

export async function fetchTransaction(transactionId: string): Promise<TransactionDetail> {
  const response = await apiFetch<{ data: TransactionDetail }>(
    `/admin/payments/transactions/${encodeURIComponent(transactionId)}`
  );
  return response.data;
}

export async function initiateRefund(
  transactionId: string,
  payload: InitiateRefundPayload
): Promise<InitiateRefundResult> {
  const response = await apiFetch<{ data: InitiateRefundResult }>(
    `/admin/payments/transactions/${encodeURIComponent(transactionId)}/refunds`,
    { method: "POST", body: payload }
  );
  return response.data;
}

export async function fetchRefunds(
  filters: RefundFilters = {}
): Promise<{ data: RefundListItem[]; meta: PaginatedMeta }> {
  const response = await apiFetch<{ data: RefundListItem[]; meta: PaginatedMeta }>(
    `/admin/payments/refunds${toQuery(filters)}`
  );
  return { data: response.data, meta: response.meta };
}

export async function fetchRefund(refundId: string): Promise<RefundListItem> {
  const response = await apiFetch<{ data: RefundListItem }>(
    `/admin/payments/refunds/${encodeURIComponent(refundId)}`
  );
  return response.data;
}

export async function retryRefund(refundId: string): Promise<InitiateRefundResult> {
  const response = await apiFetch<{ data: InitiateRefundResult }>(
    `/admin/payments/refunds/${encodeURIComponent(refundId)}/retry`,
    { method: "POST" }
  );
  return response.data;
}
