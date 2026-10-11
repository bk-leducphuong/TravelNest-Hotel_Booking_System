import { apiFetch } from "~/services/http";

export interface HotelSummary {
  id: string;
  name: string;
  status: string;
  hotelClass: number | null;
  minPrice: string | null;
  timezone: string | null;
  city: { id: string; name: string } | null;
  country: { id: string; name: string; isoCode: string | null } | null;
  createdAt: string;
  owner: { id: string; email: string; name: string | null } | null;
}

export interface HotelMember {
  userId: string;
  role: string | null;
  isPrimaryOwner: boolean;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    status: string;
  } | null;
}

export interface HotelDetail extends HotelSummary {
  description: string | null;
  address: string | null;
  phoneNumber: string | null;
  latitude: string | null;
  longitude: string | null;
  members: HotelMember[];
  counts: { rooms: number; bookings: number; reviews: number };
  rating: { overall: number; total: number } | null;
}

export interface Paged<T> {
  data: T[];
  meta: { page: number; limit: number; total: number };
}

export interface HotelListParams {
  search?: string;
  status?: string;
  cityId?: string;
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

export async function fetchHotels(
  params: HotelListParams = {}
): Promise<Paged<HotelSummary>> {
  return await apiFetch<Paged<HotelSummary>>(
    `/superadmin/hotels${queryString(params)}`
  );
}

export async function fetchHotel(hotelId: string): Promise<HotelDetail> {
  const response = await apiFetch<{ data: HotelDetail }>(
    `/superadmin/hotels/${hotelId}`
  );
  return response.data;
}
