export interface SuperadminNavItem {
  label: string;
  to: string;
  permission?: string;
}

/**
 * Sidebar navigation. Items are hidden when the user lacks the permission.
 *
 * Phase 1 adds Hotels / Users / Audit; Phase 2 adds Finance. Only implemented
 * pages are listed here so the sidebar never links to a missing route.
 */
export const SUPERADMIN_NAV: SuperadminNavItem[] = [
  { label: "Overview", to: "/", permission: "platform.overview.read" },
];
