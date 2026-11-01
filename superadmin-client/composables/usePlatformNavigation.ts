import {
  FINANCE_NAV,
  SUPERADMIN_NAV,
  navigationForPath,
} from "~/utils/navigation";

export function usePlatformNavigation() {
  const route = useRoute();
  const { can } = usePermissions();
  const items = computed(() =>
    SUPERADMIN_NAV.filter((item) => can(item.permission))
  );
  const active = computed(() => navigationForPath(route.path));
  const destinations = computed(() => [
    ...items.value,
    ...(can("platform.finance.read")
      ? FINANCE_NAV.filter((item) => item.to !== "/finance")
      : []),
  ]);
  const titleKey = computed(() => {
    if (typeof route.meta.platformTitle === "string")
      return route.meta.platformTitle;
    if (route.path === "/login") return "login.title";
    if (route.path === "/403") return "forbidden.title";
    return (
      FINANCE_NAV.find((item) => item.to === route.path)?.labelKey ??
      active.value?.labelKey ??
      "shell.workspace"
    );
  });
  return { items, active, destinations, titleKey };
}
