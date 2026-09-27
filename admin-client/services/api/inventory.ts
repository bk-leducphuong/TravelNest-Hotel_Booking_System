import { apiFetch } from "~/services/http";

export interface OccupancySummary {
  hotelId: string;
  startDate: string;
  endDate: string;
  totalRooms: number;
  bookedRooms: number;
  heldRooms: number;
  availableRooms: number;
  avgPrice: number;
  occupancyRate: number;
  dayCount: number;
  roomCount: number;
}

export interface RoomInventorySummary {
  totalRooms: number;
  bookedRooms: number;
  heldRooms: number;
  availableRooms: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  dayCount: number;
}

export interface HotelRoomInventory {
  roomId: string;
  roomName: string;
  roomType?: string | null;
  roomStatus: string;
  quantity: number;
  hasInventory: boolean;
  inventory: RoomInventorySummary | null;
}

export interface HotelRoomsInventory {
  hotelId: string;
  startDate: string;
  endDate: string;
  rooms: HotelRoomInventory[];
}

export interface InventoryDay {
  date: string;
  totalRooms: number;
  bookedRooms: number;
  heldRooms: number;
  availableRooms: number;
  status: string;
  pricePerNight: number;
  currency: string;
}

export interface RoomInventoryRange {
  roomId: string;
  roomName: string;
  hotelId: string;
  startDate: string;
  endDate: string;
  days: InventoryDay[];
}

export interface InventoryEntryInput {
  date: string;
  pricePerNight?: number;
  totalRooms?: number;
  status?: string;
  currency?: string;
}

export interface InventoryUpdatePayload {
  entries?: InventoryEntryInput[];
  startDate?: string;
  endDate?: string;
  pricePerNight?: number;
  totalRooms?: number;
  status?: string;
  currency?: string;
  reason?: string;
}

export interface InventoryUpdateResult {
  roomId: string;
  hotelId: string;
  dateCount: number;
  created: number;
  updated: number;
}

export interface OccupancyRange {
  startDate?: string;
  endDate?: string;
}

function rangeQuery(range: OccupancyRange): string {
  const params = new URLSearchParams();
  if (range.startDate) params.set("startDate", range.startDate);
  if (range.endDate) params.set("endDate", range.endDate);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchOccupancy(
  hotelId: string,
  range: OccupancyRange = {}
): Promise<OccupancySummary> {
  const response = await apiFetch<{ data: OccupancySummary }>(
    `/admin/inventory/hotels/${encodeURIComponent(hotelId)}/occupancy${rangeQuery(range)}`
  );
  return response.data;
}

export async function fetchHotelRooms(
  hotelId: string,
  range: OccupancyRange = {}
): Promise<HotelRoomsInventory> {
  const response = await apiFetch<{ data: HotelRoomsInventory }>(
    `/admin/inventory/hotels/${encodeURIComponent(hotelId)}/rooms${rangeQuery(range)}`
  );
  return response.data;
}

export async function fetchRoomInventory(
  roomId: string,
  range: OccupancyRange = {}
): Promise<RoomInventoryRange> {
  const response = await apiFetch<{ data: RoomInventoryRange }>(
    `/admin/inventory/rooms/${encodeURIComponent(roomId)}${rangeQuery(range)}`
  );
  return response.data;
}

export async function updateRoomInventory(
  roomId: string,
  payload: InventoryUpdatePayload
): Promise<InventoryUpdateResult> {
  const response = await apiFetch<{ data: InventoryUpdateResult }>(
    `/admin/inventory/rooms/${encodeURIComponent(roomId)}`,
    { method: "PATCH", body: payload }
  );
  return response.data;
}
