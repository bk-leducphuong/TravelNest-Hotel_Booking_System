const passport = require('passport');
const authService = require('@services/auth.service');
const logger = require('@config/logger.config');
const asyncHandler = require('@utils/asyncHandler');
const validate = require('@middlewares/validate.middleware');
const { buildSession } = require('@helpers/session');

/**
 * GET /api/auth/session
 * Check authentication status
 */
const checkAuth = asyncHandler(async (req, res) => {
  const session = buildSession(req.sessionID, req.session.userData || null);

  res.status(200).json({
    data: {
      session: session,
      isAuthenticated: session.user !== null,
    },
  });
});

/**
 * POST /api/auth/email/check
 * Check if email exists
 */
const checkEmail = asyncHandler(async (req, res) => {
  const { email, userRole } = req.body; // Already validated by Joi

  const result = await authService.checkEmail(email, userRole);

  res.status(200).json({
    data: result,
  });
});

/**
 * POST /api/auth/sessions
 * Login (create session)
 */
const login = asyncHandler(async (req, res) => {
  const { email, password, userRole } = req.body; // Already validated by Joi

  const sessionData = await authService.login(email, password, userRole);

  // Build and store session
  const session = buildSession(req.sessionID, sessionData.userData);
  req.session.userData = sessionData.userData;

  res.status(201).json({
    data: {
      session: session,
      message: 'Logged in successfully',
    },
  });
});

/**
 * DELETE /api/auth/sessions
 * Logout (destroy session)
 */
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error({ err }, 'Error destroying session');
      return res.status(500).json({
        error: {
          code: 'LOGOUT_FAILED',
          message: 'Logout failed',
        },
      });
    }
    res.clearCookie('connect.sid');
    res.status(204).send();
  });
};

/**
 * POST /api/auth/users
 * Register new user
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, userRole } = req.body; // Already validated by Joi

  const userData = await authService.register(
    email,
    password,
    firstName,
    lastName,
    userRole
  );

  // Build and store session
  const session = buildSession(req.sessionID, userData.userData);
  req.session.userData = userData.userData;

  res.status(201).json({
    data: {
      session: session,
      message: 'User registered successfully',
    },
  });
});

module.exports = {
  checkAuth,
  checkEmail,
  login,
  logout,
  register,
};
