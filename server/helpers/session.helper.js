/**
 * Map role name to user type
 * @param {string} roleName - Role name from roles table
 * @returns {string} User type (GUEST | USER | STAFF | ADMIN)
 */
function mapRoleToUserType(roleName) {
  const roleMap = {
    guest: 'GUEST',
    user: 'USER',
    owner: 'STAFF',
    manager: 'STAFF',
    staff: 'STAFF',
    support_agent: 'STAFF',
    admin: 'ADMIN',
  };
  return roleMap[roleName] || 'GUEST';
}

/**
 * Build session structure
 * @param {string} sessionId - Session ID
 * @param {Object|null} userData - User data with roles and hotel context
 * @returns {Object} Session object
 */
function buildSession(sessionId, userData) {
  if (!userData) {
    return {
      id: sessionId,
      user: null,
      context: null,
    };
  }

  // Get primary role (first role or highest priority)
  const primaryRole = userData.roles?.[0]?.role?.name || 'guest';
  const userType = mapRoleToUserType(primaryRole);

  // Get hotel context (if user has hotel roles)
  let context = null;
  if (userData.hotel_roles && userData.hotel_roles.length > 0) {
    // Use the first hotel role (or primary owner if exists)
    const primaryHotelRole =
      userData.hotel_roles.find((hr) => hr.is_primary_owner) || userData.hotel_roles[0];

    context = {
      hotelId: primaryHotelRole.hotel_id,
      role: primaryHotelRole.role?.name || null, // owner | manager | staff
    };
  }

  return {
    id: sessionId,
    user: {
      id: userData.id,
      type: userType,
    },
    context: context,
  };
}

module.exports = {
  buildSession,
};
