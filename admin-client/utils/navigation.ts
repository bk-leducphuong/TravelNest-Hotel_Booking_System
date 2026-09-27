export interface AdminNavItem {
  label: string;
  to: string;
  permission?: string;
}

/**
 * Sidebar navigation. Items are hidden when the user lacks the permission.
 */
export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", to: "/" },
  { label: "Bookings", to: "/bookings", permission: "booking.read" },
  { label: "Availability", to: "/availability", permission: "room.read" },
  { label: "Payments", to: "/payments", permission: "payment.read" },
  { label: "Payouts", to: "/payouts", permission: "payment.read" },
  { label: "Reviews", to: "/reviews", permission: "review.read" },
];
