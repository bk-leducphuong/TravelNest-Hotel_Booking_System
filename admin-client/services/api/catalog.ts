import { apiFetch } from "~/services/http";

export interface HotelSummary {
  id: string;
  name: string;
  address?: string | null;
  status?: string;
  city_id?: string | null;
  country_id?: string | null;
  min_price?: string | number | null;
  hotel_class?: number | null;
  created_at?: string;
}

export interface HotelDetail extends HotelSummary {
  description?: string | null;
  phone_number?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  check_in_policy?: string | null;
  check_out_policy?: string | null;
  timezone?: string | null;
}

export interface Room {
  id: string;
  hotel_id: string;
  room_name: string;
  room_type?: string | null;
  max_guests?: number | null;
  quantity?: number | null;
  room_size?: number | null;
  status?: string | null;
}

export interface HotelPolicy {
  id: string;
  hotel_id: string;
  policy_type: string;
  title: string;
  description: string;
  is_active: boolean;
  display_order: number;
  icon?: string | null;
}

export interface HotelPhoto {
  id: string;
  url?: string;
  object_key?: string;
  original_filename?: string | null;
  is_primary?: boolean;
  display_order?: number;
  image_variants?: Array<{ variant_type: string; object_key: string }>;
}

export const POLICY_TYPES = [
  "cancellation",
  "children",
  "pets",
  "payment",
  "smoking",
  "damage",
  "age_restriction",
  "internet",
  "parking",
  "breakfast",
  "group_booking",
  "additional_fees",
  "other",
] as const;

export const HOTEL_STATUSES = ["active", "inactive", "pending", "suspended"] as const;

export const ROOM_STATUSES = ["active", "inactive"] as const;

export interface HotelDetailResult {
  hotel: HotelDetail;
  rooms: Room[];
  policies: HotelPolicy[];
}

export interface HotelListMeta {
  page: number;
  limit: number;
  total: number;
}

export interface HotelListFilters {
  search?: string;
  status?: string;
  cityId?: string;
  page?: number;
  limit?: number;
}

export interface HotelUpdatePayload {
  name?: string;
  description?: string | null;
  address?: string;
  cityId?: string;
  countryId?: string;
  phoneNumber?: string | null;
  latitude?: number;
  longitude?: number;
  hotelClass?: number;
  checkInTime?: string;
  checkOutTime?: string;
  checkInPolicy?: string | null;
  checkOutPolicy?: string | null;
  minPrice?: number;
  status?: string;
  timezone?: string;
}

export interface RoomPayload {
  roomName?: string;
  roomType?: string;
  maxGuests?: number;
  quantity?: number;
  roomSize?: number;
  status?: string;
}

export interface PolicyPayload {
  policyType?: string;
  title?: string;
  description?: string;
  displayOrder?: number;
  icon?: string | null;
  isActive?: boolean;
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

export async function fetchHotels(
  filters: HotelListFilters = {}
): Promise<{ data: HotelSummary[]; meta: HotelListMeta }> {
  const response = await apiFetch<{ data: HotelSummary[]; meta: HotelListMeta }>(
    `/admin/hotels${toQuery(filters)}`
  );
  return { data: response.data, meta: response.meta };
}

export async function fetchHotel(hotelId: string): Promise<HotelDetailResult> {
  const response = await apiFetch<{ data: HotelDetailResult }>(
    `/admin/hotels/${encodeURIComponent(hotelId)}`
  );
  return response.data;
}

export async function updateHotel(
  hotelId: string,
  payload: HotelUpdatePayload
): Promise<HotelDetail> {
  const response = await apiFetch<{ data: { hotel: HotelDetail } }>(
    `/admin/hotels/${encodeURIComponent(hotelId)}`,
    { method: "PATCH", body: payload }
  );
  return response.data.hotel;
}

export async function fetchRooms(hotelId: string): Promise<Room[]> {
  const response = await apiFetch<{ data: { rooms: Room[] } }>(
    `/admin/hotels/${encodeURIComponent(hotelId)}/rooms`
  );
  return response.data.rooms;
}

export async function createRoom(hotelId: string, payload: RoomPayload): Promise<Room> {
  const response = await apiFetch<{ data: { room: Room } }>(
    `/admin/hotels/${encodeURIComponent(hotelId)}/rooms`,
    { method: "POST", body: payload }
  );
  return response.data.room;
}

export async function updateRoom(
  hotelId: string,
  roomId: string,
  payload: RoomPayload
): Promise<Room> {
  const response = await apiFetch<{ data: { room: Room } }>(
    `/admin/hotels/${encodeURIComponent(hotelId)}/rooms/${encodeURIComponent(roomId)}`,
    { method: "PATCH", body: payload }
  );
  return response.data.room;
}

export async function deleteRoom(hotelId: string, roomId: string): Promise<void> {
  await apiFetch(
    `/admin/hotels/${encodeURIComponent(hotelId)}/rooms/${encodeURIComponent(roomId)}`,
    { method: "DELETE" }
  );
}

export async function fetchPolicies(hotelId: string): Promise<HotelPolicy[]> {
  const response = await apiFetch<{ data: { policies: HotelPolicy[] } }>(
    `/admin/hotels/${encodeURIComponent(hotelId)}/policies`
  );
  return response.data.policies;
}

export async function createPolicy(hotelId: string, payload: PolicyPayload): Promise<HotelPolicy> {
  const response = await apiFetch<{ data: { policy: HotelPolicy } }>(
    `/admin/hotels/${encodeURIComponent(hotelId)}/policies`,
    { method: "POST", body: payload }
  );
  return response.data.policy;
}

export async function updatePolicy(
  hotelId: string,
  policyId: string,
  payload: PolicyPayload
): Promise<HotelPolicy> {
  const response = await apiFetch<{ data: { policy: HotelPolicy } }>(
    `/admin/hotels/${encodeURIComponent(hotelId)}/policies/${encodeURIComponent(policyId)}`,
    { method: "PATCH", body: payload }
  );
  return response.data.policy;
}

export async function deletePolicy(hotelId: string, policyId: string): Promise<void> {
  await apiFetch(
    `/admin/hotels/${encodeURIComponent(hotelId)}/policies/${encodeURIComponent(policyId)}`,
    { method: "DELETE" }
  );
}

// --- Photos (owned by the media module) ---

interface ImagesResponse {
  data: { count: number; images: HotelPhoto[] };
}

export async function fetchHotelPhotos(hotelId: string): Promise<HotelPhoto[]> {
  const response = await apiFetch<ImagesResponse>(
    `/images/hotel/${encodeURIComponent(hotelId)}`
  );
  return response.data.images;
}

export async function uploadHotelPhoto(
  hotelId: string,
  file: File,
  isPrimary = false
): Promise<HotelPhoto> {
  const form = new FormData();
  form.append("file", file);
  form.append("is_primary", isPrimary ? "true" : "false");

  const response = await apiFetch<{ data: HotelPhoto }>(
    `/images/hotel/${encodeURIComponent(hotelId)}`,
    { method: "POST", body: form }
  );
  return response.data;
}

export async function deleteHotelPhoto(imageId: string): Promise<void> {
  await apiFetch(`/images/${encodeURIComponent(imageId)}`, { method: "DELETE" });
}

export async function setPrimaryHotelPhoto(hotelId: string, imageId: string): Promise<void> {
  await apiFetch(
    `/images/hotel/${encodeURIComponent(hotelId)}/primary/${encodeURIComponent(imageId)}`,
    { method: "PUT" }
  );
}
