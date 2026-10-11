export interface SuperadminNavItem {
  label: string;
  to: string;
  permission?: string;
}

/**
 * Sidebar navigation. Items are hidden when the user lacks the permission.
 *
 * Finance (Phase 2) will be added here when its pages land.
 */
export const SUPERADMIN_NAV: SuperadminNavItem[] = [
  { label: "Overview", to: "/", permission: "platform.overview.read" },
  { label: "Hotels", to: "/hotels", permission: "platform.hotel.read" },
  { label: "Users", to: "/users", permission: "platform.user.read" },
  { label: "Audit log", to: "/audit", permission: "platform.audit.read" },
];
