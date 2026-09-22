import { apiFetch } from "~/services/http";

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ReviewSummary {
  hotelId: string;
  totalReviews: number;
  byStatus: Record<string, number>;
  publishedCount: number;
  averageRating: number;
  repliedCount: number;
  unrepliedCount: number;
}

export interface ReviewUser {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  profile_picture_url?: string | null;
  country?: string | null;
}

export interface ReviewReply {
  id: string;
  reply_text: string;
  created_at?: string | null;
  updated_at?: string | null;
  user?: { id: string; first_name?: string | null; last_name?: string | null } | null;
}

export interface ReviewMedia {
  id: string;
  media_type: string;
  url: string;
  thumbnail_url?: string | null;
  display_order?: number | null;
}

export interface ReviewHotel {
  id: string;
  name?: string | null;
}

export interface Review {
  id: string;
  hotel_id: string;
  booking_id?: string | null;
  rating_overall: string | number;
  rating_cleanliness?: string | number | null;
  rating_location?: string | number | null;
  rating_service?: string | number | null;
  rating_value?: string | number | null;
  title?: string | null;
  comment?: string | null;
  status: string;
  is_verified: boolean;
  helpful_count: number;
  created_at: string;
  updated_at?: string | null;
  user?: ReviewUser | null;
  reply?: ReviewReply | null;
  media?: ReviewMedia[];
  hotel?: ReviewHotel | null;
}

export interface ReviewFilters {
  status?: string;
  minRating?: number;
  maxRating?: number;
  hasReply?: boolean | string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface ReviewStatusResult {
  reviewId: string;
  previousStatus: string;
  status: string;
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

export async function fetchReviewSummary(hotelId: string): Promise<ReviewSummary> {
  const response = await apiFetch<{ data: ReviewSummary }>(
    `/admin/reviews/summary?hotelId=${encodeURIComponent(hotelId)}`
  );
  return response.data;
}

export async function fetchReviews(
  filters: ReviewFilters = {}
): Promise<{ data: Review[]; meta: PaginatedMeta }> {
  const response = await apiFetch<{ data: Review[]; meta: PaginatedMeta }>(
    `/admin/reviews${toQuery(filters)}`
  );
  return { data: response.data, meta: response.meta };
}

export async function fetchReview(reviewId: string): Promise<Review> {
  const response = await apiFetch<{ data: Review }>(
    `/admin/reviews/${encodeURIComponent(reviewId)}`
  );
  return response.data;
}

export async function setReviewStatus(
  reviewId: string,
  payload: { status: string; reason?: string }
): Promise<ReviewStatusResult> {
  const response = await apiFetch<{ data: ReviewStatusResult }>(
    `/admin/reviews/${encodeURIComponent(reviewId)}/status`,
    { method: "PATCH", body: payload }
  );
  return response.data;
}

export async function replyToReview(reviewId: string, reply: string): Promise<{ reviewId: string; reply: string }> {
  const response = await apiFetch<{ data: { reviewId: string; reply: string } }>(
    `/admin/reviews/${encodeURIComponent(reviewId)}/reply`,
    { method: "POST", body: { reply } }
  );
  return response.data;
}

export async function updateReviewReply(
  reviewId: string,
  reply: string
): Promise<{ reviewId: string; reply: string }> {
  const response = await apiFetch<{ data: { reviewId: string; reply: string } }>(
    `/admin/reviews/${encodeURIComponent(reviewId)}/reply`,
    { method: "PATCH", body: { reply } }
  );
  return response.data;
}

export async function deleteReviewReply(
  reviewId: string
): Promise<{ reviewId: string; deleted: boolean }> {
  const response = await apiFetch<{ data: { reviewId: string; deleted: boolean } }>(
    `/admin/reviews/${encodeURIComponent(reviewId)}/reply`,
    { method: "DELETE" }
  );
  return response.data;
}
