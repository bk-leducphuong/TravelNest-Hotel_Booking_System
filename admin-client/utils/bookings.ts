/**
 * Booking status rules mirrored from the server domain
 * (`server/modules/booking/domain/booking-status.js`).
 */

export type BookingStatus =
  | "pending"
  | "pending_payment"
  | "confirmed"
  | "payment_failed"
  | "expired"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";

export const BOOKING_STATUSES: BookingStatus[] = [
  "pending",
  "pending_payment",
  "confirmed",
  "payment_failed",
  "expired",
  "checked_in",
  "completed",
  "cancelled",
  "no_show",
];

/** Statuses assignable through PATCH /status (cancelling has its own endpoint). */
const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  pending_payment: ["confirmed", "cancelled"],
  payment_failed: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "no_show", "cancelled"],
  checked_in: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  expired: [],
  no_show: [],
};

const CANCELLABLE: BookingStatus[] = [
  "pending",
  "pending_payment",
  "payment_failed",
  "confirmed",
  "checked_in",
];

export function allowedNextStatuses(from: string): BookingStatus[] {
  return (ALLOWED_TRANSITIONS[from as BookingStatus] ?? []).filter(
    (status) => status !== "cancelled"
  );
}

export function canCancelBooking(from: string): boolean {
  return CANCELLABLE.includes(from as BookingStatus);
}

export function bookingStatusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function bookingStatusTagType(
  status: string
): "primary" | "success" | "info" | "warning" | "danger" {
  switch (status) {
    case "confirmed":
    case "checked_in":
      return "success";
    case "completed":
      return "info";
    case "pending":
    case "pending_payment":
      return "warning";
    case "cancelled":
    case "expired":
    case "payment_failed":
    case "no_show":
      return "danger";
    default:
      return "info";
  }
}

/** Use the booking contact snapshot when its buyer account is unavailable. */
export function bookingGuestLabel(
  booking?: {
    buyer?: {
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
      id?: string;
    } | null;
    guest_details?: Record<string, unknown> | null;
  } | null
): string {
  const buyer = booking?.buyer;
  const contact = booking?.guest_details;
  const snapshotName = contact?.fullName ?? contact?.full_name ?? contact?.name;
  const snapshotEmail = contact?.email;
  const buyerName = [buyer?.first_name, buyer?.last_name]
    .filter(Boolean)
    .join(" ");
  return (
    buyerName ||
    (typeof snapshotName === "string" ? snapshotName.trim() : "") ||
    buyer?.email ||
    (typeof snapshotEmail === "string" ? snapshotEmail.trim() : "") ||
    buyer?.id ||
    "—"
  );
}
