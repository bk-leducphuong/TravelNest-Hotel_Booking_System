const logger = require('@config/logger.config');
const identityService = require('@services/identity.service');
const keycloakUserInfoService = require('@services/keycloak-userinfo.service');
const ApiError = require('@utils/ApiError');
const { verifyJwt } = require('@utils/jwt.util');
const { ROLES } = require('@constants/roles');
const { collectPermissionNames } = require('@helpers/permission.helper');

function getBearerToken(req) {
  const authorization = req.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
}

async function authenticateRequest(req) {
  const token = getBearerToken(req);
  if (!token) {
    throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required.');
  }

  let verifiedToken;

  try {
    verifiedToken = verifyJwt(token);
  } catch (error) {
    throw new ApiError(401, 'INVALID_TOKEN', error.message || 'Bearer token is invalid');
  }

  const enrichedToken = await enrichTokenClaims(verifiedToken, token);
  const user = await identityService.resolveAuthenticatedUser(enrichedToken);

  req.auth = {
    provider: 'keycloak',
    subject: enrichedToken.subject,
    email: enrichedToken.email,
    roles: enrichedToken.roles,
    token: enrichedToken.payload,
  };
  req.user = user;
}

async function enrichTokenClaims(verifiedToken, accessToken) {
  if (verifiedToken?.subject && verifiedToken?.email) {
    return verifiedToken;
  }

  const userInfo = await keycloakUserInfoService.getUserInfo(accessToken);
  const subject = verifiedToken?.subject || userInfo.sub || null;
  const email =
    verifiedToken?.email || (userInfo.email ? String(userInfo.email).toLowerCase() : null);

  return {
    ...verifiedToken,
    subject,
    email,
    payload: {
      ...(verifiedToken?.payload || {}),
      ...userInfo,
      sub: subject,
      email,
    },
  };
}

async function authenticate(req, res, next) {
  try {
    await authenticateRequest(req);
    return next();
  } catch (error) {
    logger.warn({ error: error }, 'Authentication failed');
    return res.status(error.statusCode || 401).json({
      success: false,
      message: error.message || 'Unauthorized access. Please log in.',
    });
  }
}

async function optionalAuthenticate(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return next();
    }

    await authenticateRequest(req);
    return next();
  } catch (error) {
    logger.warn({ error: error.message }, 'Optional authentication failed');
    if (error.statusCode === 401) {
      return next();
    }

    return next(error);
  }
}

function resolveRequestedHotelId(req) {
  return (
    req.get?.('x-hotel-id') ||
    req.params?.hotelId ||
    req.body?.hotelId ||
    req.query?.hotelId ||
    null
  );
}

function requirePermission(permissionName, options = {}) {
  const { requireHotelContext = false, hotelRole = null } = options;

  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
        });
      }

      const permissionNames = Array.isArray(permissionName) ? permissionName : [permissionName];
      const tokenRoles = new Set(req.auth?.roles || []);
      const globalPermissions = collectPermissionNames(req.user.roles || []);

      const isPlatformAdmin =
        tokenRoles.has(ROLES.ADMIN) ||
        (req.user.roles || []).some((userRole) => userRole.role?.name === ROLES.ADMIN);
      const isPlatformStaff =
        isPlatformAdmin ||
        tokenRoles.has(ROLES.SUPPORT_AGENT) ||
        (req.user.roles || []).some((userRole) => userRole.role?.name === ROLES.SUPPORT_AGENT);

      const hasGlobalPermission =
        isPlatformAdmin || permissionNames.some((permission) => globalPermissions.has(permission));

      if (!requireHotelContext) {
        if (hasGlobalPermission) {
          return next();
        }

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions.',
        });
      }

      const hotelId = resolveRequestedHotelId(req);

      // Platform staff holding the required permission can act globally or on
      // any specific hotel without a hotel membership.
      if (isPlatformStaff && hasGlobalPermission) {
        req.hotelContext = hotelId
          ? {
              hotelId,
              role: isPlatformAdmin ? ROLES.ADMIN : ROLES.SUPPORT_AGENT,
              isPrimaryOwner: false,
              isPlatformAdmin: true,
            }
          : null;
        return next();
      }

      if (!hotelId) {
        return res.status(400).json({
          success: false,
          message: 'Hotel context is required for this operation.',
        });
      }

      const hotelUser = (req.user.hotel_roles || []).find(
        (item) => String(item.hotel_id) === String(hotelId)
      );

      if (!hotelUser) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this hotel.',
        });
      }

      const hotelRoleName = hotelUser.role?.name?.toLowerCase();
      const requiredRoleName = hotelRole?.toLowerCase();

      if (hotelRole && hotelRoleName !== requiredRoleName) {
        return res.status(403).json({
          success: false,
          message: `This operation requires ${hotelRole} role at the hotel.`,
        });
      }

      const hotelPermissions = collectPermissionNames([{ role: hotelUser.role }]);
      const hasHotelPermission =
        hotelRoleName === ROLES.OWNER ||
        permissionNames.some((permission) => hotelPermissions.has(permission)) ||
        permissionNames.some((permission) => globalPermissions.has(permission));

      if (!hasHotelPermission) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for this operation.',
        });
      }

      req.hotelContext = {
        hotelId,
        role: hotelUser.role?.name || null,
        roleId: hotelUser.role_id,
        isPrimaryOwner: hotelUser.is_primary_owner,
        isPlatformAdmin: false,
      };
      return next();
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
  authenticateRequest,
  optionalAuthenticate,
  requirePermission,
  collectPermissionNames,
};
