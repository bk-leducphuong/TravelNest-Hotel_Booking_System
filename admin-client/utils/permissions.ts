/**
 * Pure permission helpers (no Nuxt imports) so they are trivially unit-testable.
 *
 * Permission strings match the server's `constants/permissions.js`
 * (e.g. `booking.read`, `room.manage_inventory`, `payment.refund`).
 */

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
