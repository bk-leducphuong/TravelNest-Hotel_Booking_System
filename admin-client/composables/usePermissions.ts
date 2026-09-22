import { useAuthStore } from "~/stores/auth";

/**
 * Permission checks for the current admin session.
 */
export function usePermissions() {
  const auth = useAuthStore();

  const can = (permission: string): boolean => hasPermission(auth.permissions, permission);

  const canAny = (permissions: string[]): boolean =>
    hasAnyPermission(auth.permissions, permissions);

  return { can, canAny };
}
