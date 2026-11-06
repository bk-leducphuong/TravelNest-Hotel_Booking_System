import { apiFetch } from "~/services/http";

/**
 * Hotel staff / team management. Mutations require `hotel.manage_staff`
 * (owners and platform staff); the list needs `hotel.read`.
 */

export interface HotelStaffMember {
  id: string;
  userId: string;
  hotelId: string;
  role: string | null;
  isPrimaryOwner: boolean;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  createdAt?: string;
}

export const HOTEL_ROLE_NAMES = ["owner", "manager", "staff"] as const;

export async function fetchHotelStaff(hotelId: string): Promise<HotelStaffMember[]> {
  const response = await apiFetch<{ data: { staff: HotelStaffMember[] } }>(
    `/admin/hotels/${encodeURIComponent(hotelId)}/staff`
  );
  return response.data.staff;
}

export async function addHotelStaff(
  hotelId: string,
  payload: { email: string; role: string }
): Promise<HotelStaffMember> {
  const response = await apiFetch<{ data: { staff: HotelStaffMember } }>(
    `/admin/hotels/${encodeURIComponent(hotelId)}/staff`,
    { method: "POST", body: payload }
  );
  return response.data.staff;
}

export async function updateHotelStaff(
  hotelId: string,
  userId: string,
  payload: { role: string }
): Promise<HotelStaffMember> {
  const response = await apiFetch<{ data: { staff: HotelStaffMember } }>(
    `/admin/hotels/${encodeURIComponent(hotelId)}/staff/${encodeURIComponent(userId)}`,
    { method: "PATCH", body: payload }
  );
  return response.data.staff;
}

export async function removeHotelStaff(hotelId: string, userId: string): Promise<void> {
  await apiFetch(
    `/admin/hotels/${encodeURIComponent(hotelId)}/staff/${encodeURIComponent(userId)}`,
    { method: "DELETE" }
  );
}
