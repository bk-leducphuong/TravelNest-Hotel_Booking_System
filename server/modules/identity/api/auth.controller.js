const asyncHandler = require('@utils/asyncHandler');
const { buildAuthSession } = require('@helpers/auth-context.helper');

const checkAuth = asyncHandler(async (req, res) => {
  const session = buildAuthSession(req.user || null, req.auth || null);

  res.status(200).json({
    data: {
      session,
      isAuthenticated: Boolean(req.user),
    },
  });
});

module.exports = {
  checkAuth,
};
