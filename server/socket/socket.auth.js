const {
  Users,
  UserRoles,
  Roles,
  Permissions,
  RolePermissions,
  HotelUsers,
} = require('@models/index.js');
const { logger } = require('@config/logger.config');
const ApiError = require('@utils/ApiError');
const { ROLES } = require('@constants/roles');
const {
  extractUserRoles,
  extractUserPermissions,
  extractHotelRoles,
  hasHotelRole,
} = require('@helpers/user.helpers');

/**
 * Socket Authentication Middleware
 * Authenticates socket connections using session data
 * Loads user with roles and permissions
 */
const socketAuthentication = async (socket, next) => {
  try {
    const session = socket.request.session;

    // Check if session exists
    if (!session) {
      logger.warn('Socket connection attempt without session');
      return next(new ApiError(401, 'UNAUTHORIZED', 'No session found'));
    }

    // Check if user is logged in
    if (!session.user?.id) {
      logger.warn('Socket connection attempt without authenticated user');
      return next(new ApiError(401, 'UNAUTHORIZED', 'User not authenticated'));
    }

    // Load user with roles and permissions
    const user = await Users.findByPk(session.user.id, {
      include: [
        {
          model: UserRoles,
          as: 'roles',
          include: [
            {
              model: Roles,
              as: 'role',
              attributes: ['id', 'name', 'description'],
              include: [
                {
                  model: Permissions,
                  as: 'permissions',
                  through: {
                    model: RolePermissions,
                    attributes: [],
                  },
                  attributes: ['id', 'name', 'description'],
                },
              ],
            },
          ],
        },
        {
          model: HotelUsers,
          as: 'hotel_roles',
          attributes: ['hotel_id', 'role_id', 'is_primary_owner'],
          include: [
            {
              model: Roles,
              as: 'role',
              attributes: ['id', 'name', 'description'],
            },
          ],
        },
      ],
    });

    if (!user) {
      logger.warn(`User ${session.user.id} not found in database`);
      return next(new ApiError(401, 'UNAUTHORIZED', 'User not found'));
    }

    // Check user status
    if (user.status !== 'active') {
      logger.warn(`Inactive user ${user.id} attempted socket connection`, {
        status: user.status,
      });
      return next(
        new ApiError(403, 'FORBIDDEN', `Account is ${user.status}. Please contact support.`)
      );
    }

    // Attach user data to socket
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

    // Log successful authentication
    logger.info(`Socket authenticated: User ${user.id}`, {
      userId: user.id,
      roles: socket.user.roles,
      socketId: socket.id,
    });

    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new ApiError(500, 'AUTH_ERROR', 'Authentication failed'));
  }
};

/**
 * Socket Authorization Middleware Factory
 * Creates middleware to check if user has required role(s)
 * @param {string|string[]} allowedRoles - Role(s) that can access this namespace
 */
const socketAuthorization = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return async (socket, next) => {
    try {
      // Ensure user is authenticated
      if (!socket.user) {
        logger.warn('Authorization check on unauthenticated socket');
        return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
      }

      // Check if user has any of the allowed roles
      const hasRole = socket.user.roles.some((userRole) => roles.includes(userRole));

      if (!hasRole) {
        logger.warn(`User ${socket.user.id} attempted unauthorized access`, {
          userId: socket.user.id,
          userRoles: socket.user.roles,
          requiredRoles: roles,
          socketId: socket.id,
        });
        return next(
          new ApiError(403, 'FORBIDDEN', `Access denied. Required roles: ${roles.join(', ')}`)
        );
      }

      // Log successful authorization
      logger.info(`Socket authorized: User ${socket.user.id}`, {
        userId: socket.user.id,
        roles: socket.user.roles,
        namespace: socket.nsp.name,
        socketId: socket.id,
      });

      next();
    } catch (error) {
      logger.error('Socket authorization error:', error);
      next(new ApiError(500, 'AUTH_ERROR', 'Authorization failed'));
    }
  };
};

/**
 * Socket Permission Check Middleware Factory
 * Creates middleware to check if user has required permission(s)
 * @param {string|string[]} requiredPermissions - Permission(s) required
 */
const socketPermissionCheck = (requiredPermissions) => {
  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  return async (socket, next) => {
    try {
      if (!socket.user) {
        return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
      }

      // Admins have all permissions
      if (socket.user.roles.includes(ROLES.ADMIN)) {
        return next();
      }

      // Check if user has any of the required permissions
      const hasPermission = permissions.some((perm) => socket.user.permissions.includes(perm));

      if (!hasPermission) {
        logger.warn(`User ${socket.user.id} lacks required permissions for socket event`, {
          userId: socket.user.id,
          userPermissions: socket.user.permissions,
          requiredPermissions: permissions,
        });
        return next(
          new ApiError(
            403,
            'FORBIDDEN',
            `Insufficient permissions. Required: ${permissions.join(', ')}`
          )
        );
      }

      next();
    } catch (error) {
      logger.error('Socket permission check error:', error);
      next(new ApiError(500, 'AUTH_ERROR', 'Permission check failed'));
    }
  };
};

/**
 * Socket Hotel Context Middleware
 * Validates and attaches hotel context to socket
 * @param {boolean} required - Whether hotel context is required
 */
const socketHotelContext = (required = true) => {
  return async (socket, next) => {
    try {
      if (!socket.user) {
        return next(new ApiError(401, 'UNAUTHORIZED', 'Authentication required'));
      }

      // Listen for hotel context updates
      socket.on('setHotelContext', async (hotelId, callback) => {
        try {
          // Validate hotelId
          if (!hotelId) {
            const error = { success: false, message: 'Hotel ID is required' };
            return callback ? callback(error) : socket.emit('error', error);
          }

          // Check if user has access to this hotel
          const hotelRole = socket.user.hotelRoles.find((hr) => hr.hotelId === hotelId);

          if (!hotelRole && !socket.user.roles.includes(ROLES.ADMIN)) {
            const error = {
              success: false,
              message: 'You do not have access to this hotel',
            };
            return callback ? callback(error) : socket.emit('error', error);
          }

          // Set hotel context
          socket.hotelContext = {
            hotelId,
            role: hotelRole?.role || ROLES.ADMIN,
            roleId: hotelRole?.roleId || null,
            isPrimaryOwner: hotelRole?.isPrimaryOwner || false,
          };

          // Join hotel-specific room
          const hotelRoom = `hotel_${hotelId}`;
          await socket.join(hotelRoom);

          logger.info(`Socket joined hotel room: ${hotelRoom}`, {
            userId: socket.user.id,
            hotelId,
            socketId: socket.id,
          });

          const response = {
            success: true,
            message: 'Hotel context set successfully',
            hotelContext: socket.hotelContext,
          };

          if (callback) callback(response);
        } catch (error) {
          logger.error('Error setting hotel context:', error);
          const errorResponse = {
            success: false,
            message: 'Failed to set hotel context',
          };
          if (callback) callback(errorResponse);
        }
      });

      // If hotel context is required but not set, wait for it
      if (required && !socket.hotelContext) {
        socket.once('setHotelContext', () => next());

        // Timeout if context not provided
        setTimeout(() => {
          if (!socket.hotelContext) {
            logger.warn('Hotel context not provided within timeout', {
              userId: socket.user.id,
              socketId: socket.id,
            });
            next(new ApiError(400, 'CONTEXT_REQUIRED', 'Hotel context is required'));
          }
        }, 5000);
      } else {
        next();
      }
    } catch (error) {
      logger.error('Socket hotel context error:', error);
      next(new ApiError(500, 'CONTEXT_ERROR', 'Hotel context setup failed'));
    }
  };
};

/**
 * Wrap Express middleware for Socket.IO use
 */
const wrapMiddleware = (middleware) => (socket, next) => {
  middleware(socket.request, {}, next);
};

module.exports = {
  socketAuthentication,
  socketAuthorization,
  socketPermissionCheck,
  socketHotelContext,
  wrapMiddleware,
  hasHotelRole,
};
