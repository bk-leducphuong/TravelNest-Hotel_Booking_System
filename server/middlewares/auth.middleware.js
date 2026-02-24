const {
  Users,
  UserRoles,
  Roles,
  Permissions,
  RolePermissions,
  HotelUsers,
} = require('@models/index.js');
const { Op } = require('sequelize');
const logger = require('@config/logger.config');

/**
 * Middleware: Authenticate user
 * Checks if user is authenticated and loads user data with roles and permissions
 */
async function authenticate(req, res, next) {
  try {
    // Check if session exists and has user data
    if (!req.session?.userData?.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized access. Please log in.',
      });
    }

    // Load user with roles and hotel context
    const user = await Users.findByPk(req.session.userData.id, {
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
      return res.status(401).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Check user status
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}. Please contact support.`,
      });
    }

    // Attach user to request
    req.user = user;
    return next();
  } catch (error) {
    logger.error({ error }, 'Authentication error');
    return res.status(500).json({
      success: false,
      message: 'Authentication error.',
    });
  }
}

/**
 * Middleware: Require permission
 * Checks if user has the required permission (via global roles or hotel context)
 * @param {string|string[]} permissionName - Permission name(s) to check (e.g., 'hotel.read', 'hotel.manage_staff')
 * @param {Object} options - Options for permission check
 * @param {boolean} options.requireHotelContext - If true, requires hotel context from session
 * @param {string} options.hotelRole - Required hotel role if hotel context is needed (OWNER, MANAGER, STAFF)
 * @returns {Function} Express middleware function
 */
function requirePermission(permissionName, options = {}) {
  const { requireHotelContext = false, hotelRole = null } = options;

  return async (req, res, next) => {
    try {
      // Ensure user is authenticated first
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
        });
      }

      const permissionNames = Array.isArray(permissionName) ? permissionName : [permissionName];

      // Get user's global roles and their permissions
      const userRoleIds = req.user.roles?.map((ur) => ur.role.id) || [];
      const userPermissions = new Set();

      // Collect all permissions from user's global roles
      req.user.roles?.forEach((userRole) => {
        userRole.role.permissions?.forEach((permission) => {
          userPermissions.add(permission.name);
        });
      });

      // Check if user has any of the required permissions via global roles
      const hasGlobalPermission = permissionNames.some((perm) => userPermissions.has(perm));

      // If hotel context is required, check hotel-specific permissions
      if (requireHotelContext) {
        const sessionContext = req.session?.context;
        const hotelId = sessionContext?.hotelId || req.params?.hotelId || req.body?.hotelId;

        if (!hotelId) {
          return res.status(400).json({
            success: false,
            message: 'Hotel context is required for this operation.',
          });
        }

        // Check if user has a role at this hotel
        const hotelUser = req.user.hotel_roles?.find((hr) => hr.hotel_id === hotelId);

        if (!hotelUser) {
          return res.status(403).json({
            success: false,
            message: 'You do not have access to this hotel.',
          });
        }

        // If specific hotel role is required, check it
        const hotelRoleName = hotelUser.role?.name?.toLowerCase();
        const requiredRoleName = hotelRole?.toLowerCase();

        if (hotelRole && hotelRoleName !== requiredRoleName) {
          return res.status(403).json({
            success: false,
            message: `This operation requires ${hotelRole} role at the hotel.`,
          });
        }

        // For hotel-specific operations, we might want to check additional permissions
        // For now, having the hotel role is sufficient, but you can extend this
        // to check hotel-specific permissions if needed

        // If user has hotel context AND global permission, allow access
        if (hasGlobalPermission) {
          req.hotelContext = {
            hotelId: hotelId,
            role: hotelUser.role?.name || null,
            roleId: hotelUser.role_id,
            isPrimaryOwner: hotelUser.is_primary_owner,
          };
          return next();
        }

        // Owner role grants all permissions for their hotel
        if (hotelRoleName === 'owner') {
          req.hotelContext = {
            hotelId: hotelId,
            role: hotelUser.role?.name || null,
            roleId: hotelUser.role_id,
            isPrimaryOwner: hotelUser.is_primary_owner,
          };
          return next();
        }

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for this operation.',
        });
      }

      // If no hotel context required, just check global permissions
      if (hasGlobalPermission) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions.',
      });
    } catch (error) {
      logger.error({ error }, 'Permission check error');
      return res.status(500).json({
        success: false,
        message: 'Permission check error.',
      });
    }
  };
}

module.exports = {
  authenticate,
  requirePermission,
};
