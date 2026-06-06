const { Users, UserRoles, Roles } = require('@models/index.js');
const ApiError = require('@utils/ApiError');
const { ROLES } = require('@constants/roles');

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

function hasAdminRole(user) {
  return user.roles?.some((userRole) => userRole.role?.name === ROLES.ADMIN);
}

async function requireInternalSuperadmin(req, res, next) {
  try {
    if (hasConfiguredTokenAccess(req)) {
      return next();
    }

    const userId = req.session?.user?.id;
    if (!userId) {
      throw new ApiError(401, 'INTERNAL_SUPERADMIN_AUTH_REQUIRED', 'Superadmin access required');
    }

    const user = await Users.findByPk(userId, {
      include: [
        {
          model: UserRoles,
          as: 'roles',
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

    if (!user || user.status !== 'active' || !hasAdminRole(user)) {
      throw new ApiError(403, 'INTERNAL_SUPERADMIN_FORBIDDEN', 'Superadmin access required');
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requireInternalSuperadmin,
};
