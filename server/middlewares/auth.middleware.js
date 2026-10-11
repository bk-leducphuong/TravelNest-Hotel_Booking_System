const logger = require('@config/logger.config');
const ApiError = require('@utils/ApiError');
const { verifyJwt } = require('@utils/jwt.util');
const { ROLES } = require('@constants/roles');
const { collectPermissionNames } = require('@helpers/permission.helper');

// Identity's index mounts its own routes, which import this middleware, so
// Identity is required lazily to avoid a load-time cycle.
function identityModule() {
  return require('@modules/identity');
}

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
    verifiedToken = await verifyJwt(token);
  } catch (error) {
    throw new ApiError(401, 'INVALID_TOKEN', error.message || 'Bearer token is invalid');
  }

  const enrichedToken = await enrichTokenClaims(verifiedToken, token);
  const user = await identityModule().identity.resolveAuthenticatedUser(enrichedToken);

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

  const userInfo = await identityModule().keycloak.getUserInfo(accessToken);
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
    const message = error.message || 'Unauthorized access. Please log in.';
    return res.status(error.statusCode || 401).json({
      success: false,
      message,
      error: { code: error.code || 'AUTHENTICATION_FAILED', message },
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

/**
 * Consistent authorization-failure response: `{ success:false, message,
 * error:{ code, message } }` (the `error` object matches the validation/error
 * envelope so clients can read a code either way).
 */
function deny(res, statusCode, code, message) {
  return res.status(statusCode).json({
    success: false,
    message,
    error: { code, message },
  });
}

function resolveRequestedHotelId(req) {
  // Prefer the hotel named in the path. For routes like `/hotels/:hotelId/...`
  // the path hotel IS the resource being addressed, so it must be the one
  // authorized. Letting `X-Hotel-Id` win here allowed a caller to present their
  // own hotel in the header while targeting another hotel via the path.
  return (
    req.params?.hotelId ||
    req.get?.('x-hotel-id') ||
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
        return deny(res, 401, 'AUTHENTICATION_REQUIRED', 'Authentication required.');
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

        return deny(res, 403, 'INSUFFICIENT_PERMISSIONS', 'Insufficient permissions.');
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
        // Authenticated but with no hotel access — an authorization failure,
        // not a malformed request.
        return deny(
          res,
          403,
          'HOTEL_CONTEXT_REQUIRED',
          'You do not have access to this operation without a hotel context.'
        );
      }

      const hotelUser = (req.user.hotel_roles || []).find(
        (item) => String(item.hotel_id) === String(hotelId)
      );

      if (!hotelUser) {
        return deny(res, 403, 'HOTEL_ACCESS_DENIED', 'You do not have access to this hotel.');
      }

      const hotelRoleName = hotelUser.role?.name?.toLowerCase();
      const requiredRoleName = hotelRole?.toLowerCase();

      if (hotelRole && hotelRoleName !== requiredRoleName) {
        return deny(
          res,
          403,
          'HOTEL_ROLE_REQUIRED',
          `This operation requires ${hotelRole} role at the hotel.`
        );
      }

      // Hotel-scoped authorization is governed by the hotel role only. The
      // caller's global permissions must NOT be OR-ed in here, otherwise a
      // `staff` member would inherit e.g. `booking.cancel` from the global
      // `user` role. Platform staff (admin/support_agent) are handled above.
      // The hotel OWNER is the superuser for their own hotel: they pass any
      // hotel-scoped permission check regardless of the role's permission list.
      // This is intentional (see docs/plan/phase_1/V-admin-reviews-moderation).
      const hotelPermissions = collectPermissionNames([{ role: hotelUser.role }]);
      const hasHotelPermission =
        hotelRoleName === ROLES.OWNER ||
        permissionNames.some((permission) => hotelPermissions.has(permission));

      if (!hasHotelPermission) {
        return deny(
          res,
          403,
          'INSUFFICIENT_PERMISSIONS',
          'Insufficient permissions for this operation.'
        );
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

/**
 * Platform staff (admin/support) may act globally and on any hotel, so they
 * bypass entity-ownership checks. Everyone else is restricted to entities that
 * belong to their active hotel context.
 */
function isPlatformStaff(req) {
  const tokenRoles = new Set(req.auth?.roles || []);
  if (tokenRoles.has(ROLES.ADMIN) || tokenRoles.has(ROLES.SUPPORT_AGENT)) {
    return true;
  }
  return (req.user?.roles || []).some((userRole) =>
    [ROLES.ADMIN, ROLES.SUPPORT_AGENT].includes(userRole.role?.name)
  );
}

/**
 * Guard for admin routes addressed by an entity id (no `hotelId` in the path).
 *
 * Ensures the target entity belongs to the caller's hotel context, closing the
 * cross-hotel IDOR where the hotel was resolved from `X-Hotel-Id` alone.
 * Platform staff bypass this (they may act on any hotel).
 *
 * Place this AFTER `requirePermission(...)` so `req.hotelContext` is populated.
 *
 * @param {(req: import('express').Request) => Promise<string|null|undefined>} resolveHotelId
 * @returns {import('express').RequestHandler}
 */
function requireEntityInHotel(resolveHotelId) {
  return async (req, res, next) => {
    try {
      if (isPlatformStaff(req)) {
        return next();
      }

      const hotelContextId = req.hotelContext?.hotelId || resolveRequestedHotelId(req);
      if (!hotelContextId) {
        return deny(
          res,
          403,
          'HOTEL_CONTEXT_REQUIRED',
          'You do not have access to this resource without a hotel context.'
        );
      }

      const entityHotelId = await resolveHotelId(req);
      if (!entityHotelId || String(entityHotelId) !== String(hotelContextId)) {
        return deny(res, 403, 'RESOURCE_ACCESS_DENIED', 'You do not have access to this resource.');
      }

      return next();
    } catch (error) {
      logger.error({ error }, 'Entity-hotel ownership check failed');
      return next(error);
    }
  };
}

/**
 * Allows platform staff (global scope) or a user with at least one hotel
 * membership. For non-staff it attaches `req.hotelScopeIds` (their hotel ids)
 * so a list handler can scope its query; returns 403 when the caller has none.
 *
 * Use on "list" admin routes that must not be reachable by ordinary guests.
 */
function requirePlatformStaffOrHotels(req, res, next) {
  if (isPlatformStaff(req)) {
    return next();
  }

  const hotelIds = (req.user?.hotel_roles || []).map((h) => h.hotel_id).filter(Boolean);
  if (hotelIds.length === 0) {
    return deny(res, 403, 'NO_HOTEL_ACCESS', 'You do not have access to any hotels.');
  }

  req.hotelScopeIds = hotelIds;
  return next();
}

module.exports = {
  authenticate,
  authenticateRequest,
  optionalAuthenticate,
  requirePermission,
  requireEntityInHotel,
  requirePlatformStaffOrHotels,
  collectPermissionNames,
};
