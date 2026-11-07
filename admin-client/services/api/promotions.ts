import { apiFetch } from "~/services/http";

export type PromotionMode = "automatic" | "code";
export type PromotionStatus = "draft" | "active" | "paused" | "archived";
export type DiscountType = "percentage" | "fixed";
export type RoomScope = "all" | "selected";

export interface Promotion {
  id: string;
  hotel_id: string;
  mode: PromotionMode;
  code: string | null;
  normalized_code: string | null;
  name: string;
  description?: string | null;
  status: PromotionStatus;
  discount_type: DiscountType;
  discount_value: string | number | null;
  discount_basis_points: number | null;
  currency: string;
  max_discount_amount: string | number | null;
  room_scope: RoomScope;
  room_ids: string[];
  booking_starts_at?: string | null;
  booking_ends_at?: string | null;
  stay_starts_on?: string | null;
  stay_ends_on?: string | null;
  min_nights?: number | null;
  min_subtotal?: string | number | null;
  min_advance_days?: number | null;
  total_use_limit?: number | null;
  per_user_limit?: number | null;
  reserved_count: number;
  redeemed_count: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface PromotionInput {
  mode: PromotionMode;
  code?: string | null;
  name: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue?: number | null;
  discountBasisPoints?: number | null;
  maxDiscountAmount?: number | null;
  roomScope: RoomScope;
  roomIds?: string[];
  bookingStartsAt?: string | null;
  bookingEndsAt?: string | null;
  stayStartsOn?: string | null;
  stayEndsOn?: string | null;
  minNights?: number | null;
  minSubtotal?: number | null;
  minAdvanceDays?: number | null;
  totalUseLimit?: number | null;
  perUserLimit?: number | null;
}

export interface PromotionRedemption {
  id: string;
  status: string;
  discount_amount: string | number;
  currency: string;
  promotion_version: number;
  reserved_at?: string | null;
  redeemed_at?: string | null;
  released_at?: string | null;
  release_reason?: string | null;
  booking?: {
    id: string;
    booking_code: string;
    status: string;
    check_in_date: string;
    check_out_date: string;
  } | null;
  buyer?: {
    id: string;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}

function toQuery(params: Record<string, unknown>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const text = query.toString();
  return text ? `?${text}` : "";
}

export async function fetchPromotions(
  hotelId: string,
  params: { mode?: string; status?: string; search?: string; page?: number; limit?: number } = {}
) {
  return apiFetch<Paginated<Promotion>>(
    `/admin/hotels/${hotelId}/promotions${toQuery(params)}`
  );
}

export async function fetchPromotion(hotelId: string, promotionId: string) {
  const result = await apiFetch<{ data: Promotion }>(
    `/admin/hotels/${hotelId}/promotions/${promotionId}`
  );
  return result.data;
}

export async function createPromotion(hotelId: string, payload: PromotionInput) {
  const result = await apiFetch<{ data: Promotion }>(
    `/admin/hotels/${hotelId}/promotions`,
    { method: "POST", body: payload }
  );
  return result.data;
}

export async function updatePromotion(
  hotelId: string,
  promotionId: string,
  version: number,
  payload: Partial<PromotionInput>
) {
  const result = await apiFetch<{ data: Promotion }>(
    `/admin/hotels/${hotelId}/promotions/${promotionId}?version=${version}`,
    { method: "PATCH", body: payload }
  );
  return result.data;
}

async function transition(hotelId: string, promotionId: string, action: string) {
  const result = await apiFetch<{ data: Promotion }>(
    `/admin/hotels/${hotelId}/promotions/${promotionId}/${action}`,
    { method: "POST" }
  );
  return result.data;
}

export const activatePromotion = (hotelId: string, promotionId: string) =>
  transition(hotelId, promotionId, "activate");
export const pausePromotion = (hotelId: string, promotionId: string) =>
  transition(hotelId, promotionId, "pause");
export const archivePromotion = (hotelId: string, promotionId: string) =>
  transition(hotelId, promotionId, "archive");

export async function fetchPromotionRedemptions(
  hotelId: string,
  promotionId: string,
  params: { page?: number; limit?: number } = {}
) {
  return apiFetch<Paginated<PromotionRedemption>>(
    `/admin/hotels/${hotelId}/promotions/${promotionId}/redemptions${toQuery(params)}`
  );
}
