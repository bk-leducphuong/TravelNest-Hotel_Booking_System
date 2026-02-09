const Joi = require('joi');
const { VALID_ROLES } = require('@constants/roles');

/**
 * Auth validation schemas
 * Following RESTful API standards
 */

// Common validations
const emailSchema = Joi.string().email().max(255).required();
const passwordSchema = Joi.string().min(8).max(128).required();
const userRoleSchema = Joi.string()
  .valid(...VALID_ROLES)
  .required();
const firstNameSchema = Joi.string().min(1).max(255).trim().required();
const lastNameSchema = Joi.string().min(1).max(255).trim().required();
const phoneNumberSchema = Joi.string()
  .pattern(/^\+?[1-9]\d{1,14}$/)
  .max(20)
  .required()
  .messages({
    'string.pattern.base':
      'Phone number must be in international format (e.g., +1234567890)',
  });
const otpSchema = Joi.string()
  .pattern(/^\d{4}$/)
  .required()
  .messages({
    'string.pattern.base': 'OTP must be a 4-digit number',
  });

/**
 * GET /api/auth/session
 * Check authentication status
 * No validation needed (no params, query, or body)
 */
exports.checkAuth = {};

/**
 * POST /api/auth/email/check
 * Check if email exists
 */
exports.checkEmail = {
  body: Joi.object({
    email: emailSchema,
    userRole: userRoleSchema,
  }).required(),
};

/**
 * POST /api/auth/sessions
 * Login (create session)
 */
exports.login = {
  body: Joi.object({
    email: emailSchema,
    password: passwordSchema,
    userRole: userRoleSchema,
  }).required(),
};

/**
 * DELETE /api/auth/sessions
 * Logout (destroy session)
 * No validation needed
 */
exports.logout = {};

/**
 * POST /api/auth/users
 * Register new user
 */
exports.register = {
  body: Joi.object({
    email: emailSchema,
    password: passwordSchema,
    firstName: firstNameSchema,
    lastName: lastNameSchema,
    userRole: userRoleSchema,
  }).required(),
};

/**
 * GET /api/auth/google
 * Google OAuth redirect
 * No validation needed
 */
exports.loginGoogle = {};

/**
 * GET /api/auth/google/callback
 * Google OAuth callback
 * Handled by passport middleware
 */
exports.googleCallback = {};

/**
 * POST /api/auth/password/forgot
 * Request password reset OTP
 */
exports.forgotPassword = {
  body: Joi.object({
    email: emailSchema,
    userRole: userRoleSchema,
  }).required(),
};

/**
 * POST /api/auth/password/reset
 * Reset password with OTP
 */
exports.resetPassword = {
  body: Joi.object({
    email: emailSchema,
    userRole: userRoleSchema,
    otp: otpSchema,
    newPassword: passwordSchema,
  }).required(),
};

/**
 * POST /api/auth/admin/sessions
 * Admin login
 */
exports.loginAdmin = {
  body: Joi.object({
    email: emailSchema,
    password: passwordSchema,
    userRole: userRoleSchema,
  }).required(),
};

/**
 * POST /api/auth/admin/users
 * Admin/Partner registration
 */
exports.registerAdmin = {
  body: Joi.object({
    email: emailSchema,
    password: passwordSchema,
    userRole: userRoleSchema,
    firstName: Joi.string().min(1).max(50).trim().required(),
    lastName: Joi.string().min(1).max(50).trim().required(),
    phoneNumber: phoneNumberSchema,
  }).required(),
};

/**
 * POST /api/auth/otp/sms
 * Send SMS OTP
 */
exports.sendSmsOtp = {
  body: Joi.object({
    phoneNumber: phoneNumberSchema,
    userRole: userRoleSchema,
  }).required(),
};

/**
 * POST /api/auth/otp/verify
 * Verify SMS OTP
 */
exports.verifySmsOtp = {
  body: Joi.object({
    phoneNumber: phoneNumberSchema,
    otp: otpSchema,
  }).required(),
};
