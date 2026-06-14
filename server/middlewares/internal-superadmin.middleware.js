const ApiError = require('@utils/ApiError');
const { ROLES } = require('@constants/roles');
const { authenticateRequest } = require('@middlewares/auth.middleware');

function getRequestToken(req) {
  const headerToken = req.get('x-internal-superadmin-token');
  if (headerToken) {
    return headerToken;
  }

  const authorization = req.get('authorization');
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length);
  }

  return null;
}

function hasConfiguredTokenAccess(req) {
  const configuredToken = process.env.INTERNAL_SUPERADMIN_TOKEN || process.env.SUPERADMIN_API_TOKEN;
  const requestToken = getRequestToken(req);

  return Boolean(configuredToken && requestToken && requestToken === configuredToken);
}

async function requireInternalSuperadmin(req, res, next) {
  try {
    if (hasConfiguredTokenAccess(req)) {
      return next();
    }

    await authenticateRequest(req);

    const hasAdminRole =
      req.auth?.roles?.includes(ROLES.ADMIN) ||
      req.user?.roles?.some((userRole) => userRole.role?.name === ROLES.ADMIN);

    if (!req.user || req.user.status !== 'active' || !hasAdminRole) {
      throw new ApiError(403, 'INTERNAL_SUPERADMIN_FORBIDDEN', 'Superadmin access required');
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requireInternalSuperadmin,
};
