/**
 * Permission helpers.
 *
 * Permissions come from two places:
 *  - global roles (`user`, `admin`, `support_agent`) on the user, and
 *  - hotel roles (`owner`, `manager`, `staff`) via `hotel_users`.
 *
 * The effective permission set for hotel-scoped operations is the union.
 */

/**
 * Collect permission names from a list of role-bearing objects.
 * Accepts either user-role rows (`{ role: { permissions: [...] } }`) or bare
 * role objects wrapped as `{ role }`.
 */
function collectPermissionNames(roles = []) {
  const names = new Set();

  roles.forEach((entry) => {
    const role = entry?.role || entry;
    role?.permissions?.forEach((permission) => {
      if (permission?.name) {
        names.add(permission.name);
      }
    });
  });

  return names;
}

module.exports = {
  collectPermissionNames,
};
