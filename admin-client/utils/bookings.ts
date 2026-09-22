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
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
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
