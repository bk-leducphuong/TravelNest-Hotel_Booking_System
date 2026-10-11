import { apiFetch } from "~/services/http";

export interface CurrencyAmount {
  currency: string;
  count: number;
  amount: number;
}

export interface FinanceOverview {
  gross: CurrencyAmount[];
  refunds: CurrencyAmount[];
  payoutsPaid: CurrencyAmount[];
  payoutsPending: CurrencyAmount[];
  generatedAt: string;
}

export interface Paged<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}

interface Party {
  id: string;
  email: string;
}

interface HotelRef {
  id: string;
  name: string | null;
}

export interface PaymentRow {
  id: string;
  bookingId: string | null;
  amount: string;
  currency: string;
  status: string;
  method: string | null;
  createdAt: string;
  completedAt: string | null;
  hotel: HotelRef | null;
  buyer: Party | null;
}

export interface RefundRow {
  id: string;
  bookingId: string;
  transactionId: string;
  amount: string;
  currency: string;
  status: string;
  reason: string;
  eligibility: string;
  requestedAt: string;
  processedAt: string | null;
  hotel: HotelRef | null;
  buyer: Party | null;
}

export interface PayoutRow {
  id: string;
  amount: string;
  currency: string;
  platformFeeAmount: string;
  status: string;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  createdAt: string;
  hotel: HotelRef | null;
  owner: Party | null;
}

export interface LedgerRow {
  id: string;
  direction: string;
  amount: string;
  currency: string;
  eventType: string;
  description: string | null;
  postedAt: string;
  account: {
    id: string;
    name: string;
    accountType: string;
    currency: string;
  } | null;
  hotel: HotelRef | null;
  refs: {
    bookingId: string | null;
    transactionId: string | null;
    paymentId: string | null;
    refundId: string | null;
    payoutId: string | null;
  };
}

export interface FinanceListParams {
  status?: string;
  currency?: string;
  hotelId?: string;
  direction?: string;
  eventType?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

function queryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchFinanceOverview(): Promise<FinanceOverview> {
  const response = await apiFetch<{ data: FinanceOverview }>(
    "/superadmin/finance/overview"
  );
  return response.data;
}

export async function fetchPayments(
  params: FinanceListParams = {}
): Promise<Paged<PaymentRow>> {
  return await apiFetch<Paged<PaymentRow>>(
    `/superadmin/finance/payments${queryString(params)}`
  );
}

export async function fetchRefunds(
  params: FinanceListParams = {}
): Promise<Paged<RefundRow>> {
  return await apiFetch<Paged<RefundRow>>(
    `/superadmin/finance/refunds${queryString(params)}`
  );
}

export async function fetchPayouts(
  params: FinanceListParams = {}
): Promise<Paged<PayoutRow>> {
  return await apiFetch<Paged<PayoutRow>>(
    `/superadmin/finance/payouts${queryString(params)}`
  );
}

export async function fetchLedger(
  params: FinanceListParams = {}
): Promise<Paged<LedgerRow>> {
  return await apiFetch<Paged<LedgerRow>>(
    `/superadmin/finance/ledger${queryString(params)}`
  );
}
