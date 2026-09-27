import { useAuthStore } from "~/stores/auth";

const PLATFORM_STAFF_ROLES = ["admin", "support_agent"];

/**
 * Permission checks for the current admin session.
 *
 * Hotel-scoped actions are authorized by the **hotel role**, so for owners,
 * managers and staff we gate on the active hotel's permissions. Platform staff
 * (`admin`/`support_agent`) use their global permission set.
 */
export function usePermissions() {
  const auth = useAuthStore();

  const isPlatformStaff = computed(() =>
    auth.globalRoles.some((role) => PLATFORM_STAFF_ROLES.includes(role))
  );

  const effectivePermissions = computed<string[]>(() =>
    isPlatformStaff.value ? auth.permissions : (auth.activeHotel?.permissions ?? [])
  );

  const can = (permission: string): boolean =>
    hasPermission(effectivePermissions.value, permission);

  const canAny = (permissions: string[]): boolean =>
    hasAnyPermission(effectivePermissions.value, permissions);

  return { can, canAny, isPlatformStaff, effectivePermissions };
}
