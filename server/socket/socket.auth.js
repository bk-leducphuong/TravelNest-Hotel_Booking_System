const logger = require('@config/logger.config');
const ApiError = require('@utils/ApiError');
const { ROLES } = require('@constants/roles');
const identityService = require('@services/identity.service');
const { verifyJwt } = require('@utils/jwt.util');
const {
  extractUserRoles,
  extractUserPermissions,
  extractHotelRoles,
  hasHotelRole,
} = require('@helpers/user.helpers');

function getSocketToken(socket) {
  const authToken = socket.handshake.auth?.token;
  if (authToken) {
    return authToken;
  }

  const authorization = socket.handshake.headers?.authorization;
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  const queryToken = socket.handshake.query?.token;
  return typeof queryToken === 'string' ? queryToken : null;
}

const socketAuthentication = async (socket, next) => {
  try {
    const token = getSocketToken(socket);
    if (!token) {
      logger.warn('Socket connection attempt without bearer token');
      return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication token required'));
    }

    const verifiedToken = verifyJwt(token);
    const user = await identityService.resolveAuthenticatedUser(verifiedToken);

    socket.auth = {
      provider: 'keycloak',
      subject: verifiedToken.subject,
      email: verifiedToken.email,
      roles: verifiedToken.roles,
      token: verifiedToken.payload,
    };
    socket.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      status: user.status,
      roles: extractUserRoles(user),
      permissions: extractUserPermissions(user),
      hotelRoles: extractHotelRoles(user),
    };

    logger.info(`Socket authenticated: User ${user.id}`, {
      userId: user.id,
      roles: socket.user.roles,
      socketId: socket.id,
    });

    return next();
  } catch (error) {
    logger.error({ error: error.message }, 'Socket authentication error');
    return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication failed'));
  }
};

const socketAuthorization = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return async (socket, next) => {
    try {
      if (!socket.user) {
        return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
      }

      const hasRole = socket.user.roles.some((userRole) => roles.includes(userRole));
      if (!hasRole) {
        logger.warn(`User ${socket.user.id} attempted unauthorized socket access`, {
          userId: socket.user.id,
          userRoles: socket.user.roles,
          requiredRoles: roles,
          socketId: socket.id,
        });
        return next(
          new ApiError(403, 'FORBIDDEN', `Access denied. Required roles: ${roles.join(', ')}`)
        );
      }

      return next();
    } catch (error) {
      logger.error({ error: error.message }, 'Socket authorization error');
      return next(new ApiError(500, 'AUTH_ERROR', 'Authorization failed'));
    }
  };
};

const socketPermissionCheck = (requiredPermissions) => {
  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  return async (socket, next) => {
    try {
      if (!socket.user) {
        return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
      }

      if (socket.user.roles.includes(ROLES.ADMIN)) {
        return next();
      }

      const hasPermission = permissions.some((permission) =>
        socket.user.permissions.includes(permission)
      );

      if (!hasPermission) {
        return next(
          new ApiError(
            403,
            'FORBIDDEN',
            `Insufficient permissions. Required: ${permissions.join(', ')}`
          )
        );
      }

      return next();
    } catch (error) {
      logger.error({ error: error.message }, 'Socket permission check error');
      return next(new ApiError(500, 'AUTH_ERROR', 'Permission check failed'));
    }
  };
};

const socketHotelContext = (required = true) => {
  return async (socket, next) => {
    try {
      const hotelId = socket.handshake.auth?.hotelId || socket.handshake.query?.hotelId;

      if (!hotelId) {
        if (required) {
          return next(new ApiError(400, 'BAD_REQUEST', 'Hotel context is required'));
        }
        return next();
      }

      const hotelRole = socket.user?.hotelRoles?.find((role) => role.hotelId === hotelId);
      if (!hotelRole) {
        return next(new ApiError(403, 'FORBIDDEN', 'You do not have access to this hotel'));
      }

      socket.hotelContext = hotelRole;
      return next();
    } catch (error) {
      logger.error({ error: error.message }, 'Socket hotel context error');
      return next(new ApiError(500, 'AUTH_ERROR', 'Hotel context validation failed'));
    }
  };
};

function requireHotelRole(role) {
  return async (socket, next) => {
    try {
      const hotelId = socket.hotelContext?.hotelId || socket.handshake.auth?.hotelId;
      if (!hotelId) {
        return next(new ApiError(400, 'BAD_REQUEST', 'Hotel context is required'));
      }

      if (!hasHotelRole(socket, hotelId, role)) {
        return next(
          new ApiError(403, 'FORBIDDEN', `Hotel role ${role} is required for this action`)
        );
      }

      return next();
    } catch (error) {
      logger.error({ error: error.message }, 'Socket hotel role check error');
      return next(new ApiError(500, 'AUTH_ERROR', 'Hotel role validation failed'));
    }
  };
}

module.exports = {
  socketAuthentication,
  socketAuthorization,
  socketPermissionCheck,
  socketHotelContext,
  requireHotelRole,
};
