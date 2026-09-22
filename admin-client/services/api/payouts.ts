import { apiFetch } from "~/services/http";

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
}

export interface PayoutStatusTotal {
  count: number;
  amount: number;
}

export interface PayoutSummary {
  hotelId: string;
  byStatus: Record<string, PayoutStatusTotal>;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  payoutReady: boolean;
}

export interface PayoutOwnerRef {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface PayoutHotelRef {
  id: string;
  name?: string | null;
}

export interface ConnectedAccountRef {
  id: string;
  provider?: string;
  provider_account_id?: string;
  payouts_enabled?: boolean;
  onboarding_status?: string;
}

export interface PayoutListItem {
  id: string;
  hotel_id: string;
  owner_id: string;
  connected_payment_account_id: string;
  transaction_id?: string | null;
  provider: string;
  provider_transfer_id?: string | null;
  provider_payout_id?: string | null;
  amount: string;
  currency: string;
  platform_fee_amount: string;
  status: string;
  period_start?: string | null;
  period_end?: string | null;
  paid_at?: string | null;
  failure_code?: string | null;
  failure_message?: string | null;
  created_at: string;
  hotel?: PayoutHotelRef | null;
  owner?: PayoutOwnerRef | null;
  connected_payment_account?: ConnectedAccountRef | null;
}

export interface PayoutItem {
  id: string;
  payout_id: string;
  booking_id: string;
  transaction_id?: string | null;
  gross_amount: string;
  platform_fee_amount: string;
  net_amount: string;
  currency: string;
}

export interface PayoutDetail extends PayoutListItem {
  items?: PayoutItem[];
}

export interface ConnectedAccount {
  id: string;
  user_id: string;
  hotel_id?: string | null;
  provider: string;
  provider_account_id: string;
  account_type: string;
  country?: string | null;
  default_currency?: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  onboarding_status: string;
  disabled_reason?: string | null;
  is_default: boolean;
  last_synced_at?: string | null;
}

export interface ConnectedAccountCheck {
  configured: boolean;
  hasAccount: boolean;
  payoutReady: boolean;
  account: ConnectedAccount | null;
}

export interface PayoutFilters {
  status?: string;
  ownerId?: string;
  transactionId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface GenerateEligibleResult {
  scanned: number;
  created: number;
  payouts: PayoutListItem[];
}

export interface AccountLinkResult {
  accountId: string;
  providerAccountId: string;
  url: string;
  expiresAt: number;
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

export async function fetchPayoutSummary(hotelId: string): Promise<PayoutSummary> {
  const response = await apiFetch<{ data: PayoutSummary }>(
    `/admin/payouts/hotels/${encodeURIComponent(hotelId)}/summary`
  );
  return response.data;
}

export async function fetchPayouts(
  filters: PayoutFilters = {}
): Promise<{ data: PayoutListItem[]; meta: PaginatedMeta }> {
  const response = await apiFetch<{ data: PayoutListItem[]; meta: PaginatedMeta }>(
    `/admin/payouts${toQuery(filters)}`
  );
  return { data: response.data, meta: response.meta };
}

export async function fetchPayout(payoutId: string): Promise<PayoutDetail> {
  const response = await apiFetch<{ data: PayoutDetail }>(
    `/admin/payouts/${encodeURIComponent(payoutId)}`
  );
  return response.data;
}

export async function generateEligiblePayouts(payload: {
  cutoffDate?: string;
  ownerId?: string;
}): Promise<GenerateEligibleResult> {
  const response = await apiFetch<{ data: GenerateEligibleResult }>(`/admin/payouts/eligible`, {
    method: "POST",
    body: payload,
  });
  return response.data;
}

export async function processPayout(payoutId: string): Promise<PayoutDetail> {
  const response = await apiFetch<{ data: PayoutDetail }>(
    `/admin/payouts/${encodeURIComponent(payoutId)}/process`,
    { method: "POST" }
  );
  return response.data;
}

export async function setPayoutStatus(
  payoutId: string,
  payload: { status: string; failureCode?: string; failureMessage?: string }
): Promise<PayoutDetail> {
  const response = await apiFetch<{ data: PayoutDetail }>(
    `/admin/payouts/${encodeURIComponent(payoutId)}/status`,
    { method: "PATCH", body: payload }
  );
  return response.data;
}

export async function fetchConnectedAccounts(
  filters: { hotelId?: string; ownerId?: string }
): Promise<ConnectedAccount[]> {
  const response = await apiFetch<{ data: ConnectedAccount[] }>(
    `/admin/payouts/connected-accounts${toQuery(filters)}`
  );
  return response.data;
}

export async function checkConnectedAccount(filters: {
  hotelId?: string;
  ownerId?: string;
}): Promise<ConnectedAccountCheck> {
  const response = await apiFetch<{ data: ConnectedAccountCheck }>(
    `/admin/payouts/connected-accounts/check${toQuery(filters)}`
  );
  return response.data;
}

export async function createConnectAccount(payload: {
  ownerId: string;
  hotelId?: string;
  email?: string;
  country?: string;
  accountType?: string;
  isDefault?: boolean;
}): Promise<ConnectedAccount> {
  const response = await apiFetch<{ data: ConnectedAccount }>(
    `/admin/payouts/connected-accounts`,
    { method: "POST", body: payload }
  );
  return response.data;
}

export async function createAccountLink(
  accountId: string,
  payload: { refreshUrl?: string; returnUrl?: string } = {}
): Promise<AccountLinkResult> {
  const response = await apiFetch<{ data: AccountLinkResult }>(
    `/admin/payouts/connected-accounts/${encodeURIComponent(accountId)}/link`,
    { method: "POST", body: payload }
  );
  return response.data;
}

export async function syncConnectedAccount(accountId: string): Promise<ConnectedAccount> {
  const response = await apiFetch<{ data: ConnectedAccount }>(
    `/admin/payouts/connected-accounts/${encodeURIComponent(accountId)}/sync`,
    { method: "POST" }
  );
  return response.data;
}
