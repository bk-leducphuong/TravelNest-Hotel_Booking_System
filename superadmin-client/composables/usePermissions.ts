import { useAuthStore } from "~/stores/auth";
import {
  hasPermission,
  hasAnyPermission,
  isPlatformStaffRole,
} from "~/utils/permissions";

/**
 * Permission checks for the current platform session.
 *
 * The platform console is cross-tenant, so it gates on the caller's GLOBAL
 * permissions and roles (never hotel-scoped permissions).
 */
export function usePermissions() {
  const auth = useAuthStore();

  const isPlatformStaff = computed(() => isPlatformStaffRole(auth.globalRoles));

  const effectivePermissions = computed<string[]>(() => auth.permissions);

  const can = (permission: string): boolean =>
    hasPermission(effectivePermissions.value, permission);

  const canAny = (permissions: string[]): boolean =>
    hasAnyPermission(effectivePermissions.value, permissions);

  return { can, canAny, isPlatformStaff, effectivePermissions };
}
