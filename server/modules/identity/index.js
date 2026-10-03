const userRepository = require('./infrastructure/user.repository');
const authRepository = require('./infrastructure/auth.repository');

/**
 * Identity module - public interface.
 *
 * Owns users, auth accounts, roles and permissions (tables: users,
 * auth_accounts, roles, permissions, user_roles, role_permissions,
 * saved_hotels). Cross-module callers use the named functions here; the legacy
 * auth/identity/user services currently use the `users` / `auth` bridges and
 * move into this module next.
 */

/** Favorite hotel ids for a user, intersected with the given hotel ids. */
async function getFavoriteHotelIds(userId, hotelIds) {
  return await userRepository.findFavoriteHotelIds(userId, hotelIds);
}

module.exports = {
  getFavoriteHotelIds,

  // Transitional repository bridges for the legacy identity services. Remove
  // once auth/identity/user services live inside this module.
  users: userRepository,
  auth: authRepository,
};
