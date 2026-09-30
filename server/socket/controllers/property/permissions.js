const { ROLES, HOTEL_ROLES } = require('@constants/roles');

/**
 * Permission helpers for the /property namespace.
 */

function findHotelRole(hotelRoles, hotelId) {
  return hotelRoles.find((hotelRole) => hotelRole.hotelId === hotelId);
}

function hasHotelAccess(hotelRoles, userRoles, hotelId) {
  return Boolean(findHotelRole(hotelRoles, hotelId)) || userRoles.includes(ROLES.ADMIN);
}

function isOwnerOrManager(hotelRoles, userRoles, hotelId) {
  const hotelRole = findHotelRole(hotelRoles, hotelId);

  return (
    Boolean(hotelRole) &&
    ([HOTEL_ROLES.OWNER, HOTEL_ROLES.MANAGER].includes(hotelRole.role) ||
      userRoles.includes(ROLES.ADMIN))
  );
}

function canManageInventory(userRoles) {
  return [ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF, ROLES.ADMIN].some((role) =>
    userRoles.includes(role)
  );
}

module.exports = { findHotelRole, hasHotelAccess, isOwnerOrManager, canManageInventory };
