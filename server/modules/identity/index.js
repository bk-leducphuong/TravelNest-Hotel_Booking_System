const identityService = require('./application/identity.service');
const userService = require('./application/user.service');
const {
  extractUserRoles,
  extractUserPermissions,
  extractHotelRoles,
  hasHotelRole,
} = require('./application/user.helpers');
const userRepository = require('./infrastructure/user.repository');
const keycloakUserInfoService = require('./infrastructure/keycloak-userinfo.client');
const authRoutes = require('./api/auth.routes');
const userRoutes = require('./api/user.routes');

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
  // HTTP edge (mounted by routes/v1/index.js).
  authRoutes,
  userRoutes,

  getFavoriteHotelIds,

  // Session resolution + Role provisioning (identity.service.js).
  identity: identityService,

  // Profile, avatar, favorites and password (user.service.js).
  users: userService,

  // Keycloak userinfo client (used by the auth middleware).
  keycloak: keycloakUserInfoService,

  // User role/permission extraction (used by the realtime socket auth).
  extractUserRoles,
  extractUserPermissions,
  extractHotelRoles,
  hasHotelRole,
};
