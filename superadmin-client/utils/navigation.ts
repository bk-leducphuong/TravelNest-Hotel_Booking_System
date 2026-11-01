export interface SuperadminNavItem {
  label: string;
  labelKey: string;
  to: string;
  permission: string;
  group: "platform" | "directory" | "finance" | "governance";
  icon: "overview" | "hotels" | "users" | "finance" | "audit";
}

/**
 * Sidebar navigation. Items are hidden when the user lacks the permission.
 */
export const SUPERADMIN_NAV: SuperadminNavItem[] = [
  {
    label: "Overview",
    labelKey: "nav.overview",
    to: "/",
    permission: "platform.overview.read",
    group: "platform",
    icon: "overview",
  },
  {
    label: "Hotels",
    labelKey: "nav.hotels",
    to: "/hotels",
    permission: "platform.hotel.read",
    group: "directory",
    icon: "hotels",
  },
  {
    label: "Users",
    labelKey: "nav.users",
    to: "/users",
    permission: "platform.user.read",
    group: "directory",
    icon: "users",
  },
  {
    label: "Finance",
    labelKey: "nav.finance",
    to: "/finance",
    permission: "platform.finance.read",
    group: "finance",
    icon: "finance",
  },
  {
    label: "Audit log",
    labelKey: "nav.audit",
    to: "/audit",
    permission: "platform.audit.read",
    group: "governance",
    icon: "audit",
  },
];

export const FINANCE_NAV = [
  { to: "/finance", labelKey: "nav.financeOverview" },
  { to: "/finance/payments", labelKey: "nav.payments" },
  { to: "/finance/refunds", labelKey: "nav.refunds" },
  { to: "/finance/payouts", labelKey: "nav.payouts" },
  { to: "/finance/ledger", labelKey: "nav.ledger" },
];

/** Match segment boundaries so unknown paths never inherit unrelated access. */
export function navigationForPath(path: string) {
  return SUPERADMIN_NAV.find((item) =>
    item.to === "/"
      ? path === "/"
      : path === item.to || path.startsWith(`${item.to}/`)
  );
}

export function firstPermittedPath(permissions: string[]): string | undefined {
  return SUPERADMIN_NAV.find((item) => permissions.includes(item.permission))
    ?.to;
}
