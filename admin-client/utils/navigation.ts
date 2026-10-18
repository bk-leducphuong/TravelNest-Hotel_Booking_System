export interface AdminNavItem {
  /** i18n key; translate with `$t(item.labelKey)` at render time. */
  labelKey: string;
  to: string;
  permission?: string;
}

/**
 * Sidebar navigation. Items are hidden when the user lacks the permission.
 */
export const ADMIN_NAV: AdminNavItem[] = [
  { labelKey: "nav.dashboard", to: "/" },
  { labelKey: "nav.property", to: "/properties", permission: "hotel.read" },
  { labelKey: "nav.rooms", to: "/rooms", permission: "room.read" },
  { labelKey: "nav.bookings", to: "/bookings", permission: "booking.read" },
  { labelKey: "nav.availability", to: "/availability", permission: "room.read" },
  { labelKey: "nav.payments", to: "/payments", permission: "payment.read" },
  { labelKey: "nav.payouts", to: "/payouts", permission: "payment.read" },
  { labelKey: "nav.reviews", to: "/reviews", permission: "review.read" },
  { labelKey: "nav.settings", to: "/settings" },
];
