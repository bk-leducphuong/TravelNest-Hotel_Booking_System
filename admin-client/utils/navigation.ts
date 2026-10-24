export type NavGroup = "reservations" | "rooms" | "finance" | "settings";
export interface AdminNavItem {
  labelKey: string;
  to: string;
  permission?: string;
  group?: NavGroup;
  icon: string;
}

/** One destination list shared by desktop, mobile and quick search. */
export const ADMIN_NAV: AdminNavItem[] = [
  { labelKey: "nav.dashboard", to: "/", icon: "dashboard" },
  {
    labelKey: "nav.reservations",
    to: "/reservations",
    permission: "booking.read",
    group: "reservations",
    icon: "calendar",
  },
  {
    labelKey: "nav.bookings",
    to: "/bookings",
    permission: "booking.read",
    group: "reservations",
    icon: "bookings",
  },
  {
    labelKey: "nav.rooms",
    to: "/rooms",
    permission: "room.read",
    group: "rooms",
    icon: "rooms",
  },
  {
    labelKey: "nav.newRoom",
    to: "/rooms/new",
    permission: "room.create",
    group: "rooms",
    icon: "add",
  },
  {
    labelKey: "nav.availability",
    to: "/availability",
    permission: "room.read",
    group: "rooms",
    icon: "availability",
  },
  {
    labelKey: "nav.property",
    to: "/properties",
    permission: "hotel.read",
    icon: "property",
  },
  {
    labelKey: "nav.payments",
    to: "/payments",
    permission: "payment.read",
    group: "finance",
    icon: "finance",
  },
  {
    labelKey: "nav.payouts",
    to: "/payouts",
    permission: "payment.read",
    group: "finance",
    icon: "payouts",
  },
  {
    labelKey: "nav.refunds",
    to: "/payments/refunds",
    permission: "payment.read",
    group: "finance",
    icon: "refunds",
  },
  {
    labelKey: "nav.connectedAccounts",
    to: "/payouts/connected-accounts",
    permission: "payment.read",
    group: "finance",
    icon: "accounts",
  },
  {
    labelKey: "nav.reviews",
    to: "/reviews",
    permission: "review.read",
    icon: "reviews",
  },
  {
    labelKey: "nav.settings",
    to: "/settings",
    group: "settings",
    icon: "settings",
  },
  {
    labelKey: "nav.team",
    to: "/settings/team",
    permission: "hotel.manage_staff",
    group: "settings",
    icon: "team",
  },
];

export function visibleDestinations(
  can: (permission: string) => boolean
): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => !item.permission || can(item.permission));
}

export function groupDestinations(items: AdminNavItem[]) {
  const groups: { key: string; labelKey?: string; items: AdminNavItem[] }[] =
    [];
  for (const item of items) {
    const key = item.group ?? item.to;
    let group = groups.find((entry) => entry.key === key);
    if (!group) {
      group = {
        key,
        labelKey: item.group ? `nav.group.${item.group}` : undefined,
        items: [],
      };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

export function activeDestination(path: string, items: AdminNavItem[]) {
  return items
    .filter(
      (item) =>
        path === item.to || (item.to !== "/" && path.startsWith(`${item.to}/`))
    )
    .sort((a, b) => b.to.length - a.to.length)[0];
}
