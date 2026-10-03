const identityService = require('./application/identity.service');
const userService = require('./application/user.service');
const userRepository = require('./infrastructure/user.repository');

/**
 * Identity module - public interface.
 *
 * Owns users, auth accounts, roles and permissions (tables: users,
 * auth_accounts, roles, permissions, user_roles, role_permissions,
 * saved_hotels, hotel_users, viewed_hotels).
 *
 * `identity` (session/provisioning) and `users` (profile/favorites) are the
 * module's application services; `getFavoriteHotelIds` is a cross-module read
 * used by search.
 */

/** Favorite hotel ids for a user, intersected with the given hotel ids. */
async function getFavoriteHotelIds(userId, hotelIds) {
  return await userRepository.findFavoriteHotelIds(userId, hotelIds);
}

module.exports = {
  getFavoriteHotelIds,

  // Session resolution + Role provisioning (identity.service.js).
  identity: identityService,

  // Profile, avatar, favorites and password (user.service.js).
  users: userService,
};
