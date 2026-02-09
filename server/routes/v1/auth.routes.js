const express = require('express');
const router = express.Router();
const {
  checkAuth,
  checkEmail,
  login,
  logout,
  register,
} = require('@controllers/v1/auth.controller');
const passport = require('passport');
const validate = require('@middlewares/validate.middleware');
const authSchema = require('@validators/v1/auth.schema');

/**
 * Auth Routes - RESTful API endpoints
 * Following RESTful API standards
 */

// Session resource
// GET /api/auth/session - Check authentication status
router.get('/session', validate(authSchema.checkAuth), checkAuth);

// POST /api/auth/sessions - Login (create session)
router.post('/sessions', validate(authSchema.login), login);

// DELETE /api/auth/sessions - Logout (destroy session)
router.delete('/sessions', validate(authSchema.logout), logout);

// Email resource
// POST /api/auth/email/check - Check if email exists
router.post('/email/check', validate(authSchema.checkEmail), checkEmail);

// User resource
// POST /api/auth/users - Register new user
router.post('/users', validate(authSchema.register), register);

module.exports = router;
