import type { Room, RoomPayload } from "../services/api/catalog";

export interface RoomDraft {
  roomName: string;
  roomType: string;
  bedType: string;
  maxGuests?: number;
  quantity?: number;
  roomSize?: number;
  status: string;
}
const numberOrUndefined = (value: unknown) =>
  value === null || value === undefined || value === ""
    ? undefined
    : Number(value);
export function roomDraft(room?: Room): RoomDraft {
  return {
    roomName: room?.room_name ?? "",
    roomType: room?.room_type ?? "",
    bedType: room?.bed_type ?? "",
    maxGuests: numberOrUndefined(room?.max_guests),
    quantity: numberOrUndefined(room?.quantity),
    roomSize: numberOrUndefined(room?.room_size),
    status: room?.status ?? "active",
  };
}
export function basicRoomPayload(draft: RoomDraft): RoomPayload {
  return {
    roomName: draft.roomName.trim(),
    roomType: draft.roomType.trim() || undefined,
    status: draft.status,
  };
}
export function configurationPayload(draft: RoomDraft): RoomPayload {
  return {
    bedType: draft.bedType || undefined,
    maxGuests: draft.maxGuests,
    quantity: draft.quantity,
    roomSize: draft.roomSize,
  };
}
export const sameDraft = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);
