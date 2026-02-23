/**
 * Helper: Extract user roles from user object
 */
function extractUserRoles(user) {
  const roles = new Set();

  // Add global roles
  user.roles?.forEach((userRole) => {
    if (userRole.role?.name) {
      roles.add(userRole.role.name);
    }
  });

  // If no roles, consider as guest
  if (roles.size === 0) {
    roles.add(ROLES.GUEST);
  }

  return Array.from(roles);
}

/**
 * Helper: Extract user permissions from user object
 */
function extractUserPermissions(user) {
  const permissions = new Set();

  user.roles?.forEach((userRole) => {
    userRole.role.permissions?.forEach((permission) => {
      if (permission.name) {
        permissions.add(permission.name);
      }
    });
  });

  return Array.from(permissions);
}

/**
 * Helper: Extract hotel roles from user object
 */
function extractHotelRoles(user) {
  return (
    user.hotel_roles?.map((hotelRole) => ({
      hotelId: hotelRole.hotel_id,
      role: hotelRole.role?.name || null,
      roleId: hotelRole.role_id,
      isPrimaryOwner: hotelRole.is_primary_owner,
    })) || []
  );
}

/**
 * Helper: Check if user has specific hotel role
 */
function hasHotelRole(socket, hotelId, role) {
  if (!socket.user || !socket.user.hotelRoles) {
    return false;
  }

  const hotelRole = socket.user.hotelRoles.find((hr) => hr.hotelId === hotelId);

  if (!hotelRole) {
    return false;
  }

  return hotelRole.role === role;
}

module.exports = {
  extractUserRoles,
  extractUserPermissions,
  extractHotelRoles,
  hasHotelRole,
};
