const asyncHandler = require('@utils/asyncHandler');
const { collectPermissionNames } = require('@helpers/permission.helper');

const { getOverview } = require('../application/overview.service');

/**
 * Session bootstrap for the superadmin console: who the caller is, their global
 * roles and their global permissions. Mirrors the admin BFF's `/admin/me` shape
 * but without the hotel list (the platform console is not hotel-scoped).
 */
const getMeHandler = asyncHandler(async (req, res) => {
  const globalRoles = (req.user?.roles || [])
    .map((userRole) => userRole.role?.name)
    .filter(Boolean);
  const permissions = Array.from(collectPermissionNames(req.user?.roles || [])).sort();

  res.status(200).json({
    data: {
      user: { id: req.user?.id, email: req.user?.email },
      globalRoles,
      tokenRoles: req.auth?.roles || [],
      permissions,
    },
  });
});

const getOverviewHandler = asyncHandler(async (req, res) => {
  const data = await getOverview();
  res.status(200).json({ data });
});

module.exports = {
  getMeHandler,
  getOverviewHandler,
};
