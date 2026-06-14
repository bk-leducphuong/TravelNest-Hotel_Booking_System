const { mapRoleToUserType } = require('@helpers/session.helper');

function getAuthenticatedUserId(req) {
  return req.user?.id || null;
}

function getAuthenticatedSubject(req) {
  return req.auth?.subject || null;
}

function getTrackingSessionId(req) {
  return (
    getAuthenticatedSubject(req) ||
    req.get('x-anonymous-session-id') ||
    req.cookies?.anon_session_id ||
    req.id ||
    null
  );
}

function buildAuthSession(userData, authContext = null) {
  if (!userData) {
    return {
      id: authContext?.subject || null,
      user: null,
      context: null,
      authProvider: authContext?.provider || 'keycloak',
    };
  }

  const primaryRole = userData.roles?.[0]?.role?.name || 'guest';
  const userType = mapRoleToUserType(primaryRole);
  const primaryHotelRole =
    userData.hotel_roles?.find((hotelRole) => hotelRole.is_primary_owner) ||
    userData.hotel_roles?.[0] ||
    null;

  return {
    id: authContext?.subject || userData.keycloak_user_id || userData.id,
    user: {
      id: userData.id,
      type: userType,
      email: userData.email,
      roles: authContext?.roles || [],
    },
    context: primaryHotelRole
      ? {
          hotelId: primaryHotelRole.hotel_id,
          role: primaryHotelRole.role?.name || null,
        }
      : null,
    authProvider: authContext?.provider || 'keycloak',
  };
}

module.exports = {
  buildAuthSession,
  getAuthenticatedUserId,
  getAuthenticatedSubject,
  getTrackingSessionId,
};
