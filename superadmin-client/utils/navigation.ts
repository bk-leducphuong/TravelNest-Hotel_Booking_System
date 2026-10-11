export interface SuperadminNavItem {
  label: string;
  to: string;
  permission?: string;
}

/**
 * Sidebar navigation. Items are hidden when the user lacks the permission.
 */
export const SUPERADMIN_NAV: SuperadminNavItem[] = [
  { label: "Overview", to: "/", permission: "platform.overview.read" },
  { label: "Hotels", to: "/hotels", permission: "platform.hotel.read" },
  { label: "Users", to: "/users", permission: "platform.user.read" },
  { label: "Finance", to: "/finance", permission: "platform.finance.read" },
  { label: "Audit log", to: "/audit", permission: "platform.audit.read" },
];
