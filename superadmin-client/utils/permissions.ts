/**
 * Pure permission helpers (no Nuxt imports) so they are trivially unit-testable.
 *
 * Permission strings match the server's `constants/permissions.js`
 * (e.g. `platform.hotel.read`, `platform.user.read`).
 */

/** Global roles allowed into the platform console. */
export const PLATFORM_STAFF_ROLES = ["admin", "support_agent"] as const;

export function hasPermission(
  permissions: string[] | undefined | null,
  permission: string
): boolean {
  return Array.isArray(permissions) && permissions.includes(permission);
}

export function hasAnyPermission(
  permissions: string[] | undefined | null,
  required: string[]
): boolean {
  if (!required || required.length === 0) {
    return true;
  }
  return required.some((permission) => hasPermission(permissions, permission));
}

export function isPlatformStaffRole(
  roles: string[] | undefined | null
): boolean {
  if (!Array.isArray(roles)) {
    return false;
  }
  return roles.some((role) =>
    (PLATFORM_STAFF_ROLES as readonly string[]).includes(role)
  );
}
