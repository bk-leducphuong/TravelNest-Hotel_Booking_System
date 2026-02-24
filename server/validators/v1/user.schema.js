const Joi = require('joi');

const { pagination } = require('./common.schema');

/**
 * User validation schemas
 * Following RESTful API standards
 */

// Common validations
const emailSchema = Joi.string().email().max(255);
const phoneNumberSchema = Joi.string()
  .pattern(/^\+?[1-9]\d{1,14}$/)
  .max(20)
  .messages({
    'string.pattern.base': 'Phone number must be in international format (e.g., +1234567890)',
  });
const dateOfBirthSchema = Joi.date().iso().max('now');
const genderSchema = Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say');
const passwordSchema = Joi.string().min(8).max(128);

/**
 * GET /api/user
 * Get current user information
 * No validation needed (no params, query, or body)
 */
exports.getCurrentUser = {};

/**
 * PATCH /api/user
 * Update current user (partial update)
 */
exports.updateCurrentUser = {
  body: Joi.object({
    name: Joi.string().min(1).max(100).trim(),
    displayName: Joi.string().min(1).max(50).trim(),
    email: emailSchema,
    phoneNumber: phoneNumberSchema,
    dateOfBirth: dateOfBirthSchema,
    address: Joi.string().min(1).max(500).trim(),
    nationality: Joi.string().min(1).max(100).trim(),
    country: Joi.string().min(1).max(100).trim(),
    gender: genderSchema,
  })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided for update',
    }),
};

/**
 * PATCH /api/user/password
 * Update user password
 */
exports.updatePassword = {
  body: Joi.object({
    oldPassword: passwordSchema.required(),
    newPassword: passwordSchema.required(),
    confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
      'any.only': 'Passwords do not match',
    }),
  }).required(),
};

/**
 * PATCH /api/user/avatar
 * Update user avatar
 * Note: File validation is handled by multer middleware
 * This schema validates any additional fields if needed
 */
exports.updateAvatar = {
  body: Joi.object({}).unknown(false), // No body fields expected, only file
};

/**
 * GET /api/user/favorite-hotels
 * Get favorite hotels with pagination
 */
exports.getFavoriteHotels = {
  query: Joi.object({
    ...pagination,
  }),
};

/**
 * POST /api/user/favorite-hotels
 * Add favorite hotel
 */
exports.addFavoriteHotel = {
  body: Joi.object({
    hotelId: Joi.number().integer().positive().required().messages({
      'number.base': 'hotelId must be a number',
      'number.positive': 'hotelId must be a positive number',
      'any.required': 'hotelId is required',
    }),
  }).required(),
};

/**
 * GET /api/user/favorite-hotels/:hotelId
 * Check if hotel is favorite
 */
exports.checkFavoriteHotel = {
  params: Joi.object({
    hotelId: Joi.number().integer().positive().required().messages({
      'number.base': 'hotelId must be a number',
      'number.positive': 'hotelId must be a positive number',
      'any.required': 'hotelId is required',
    }),
  }).required(),
};

/**
 * DELETE /api/user/favorite-hotels/:hotelId
 * Remove favorite hotel
 */
exports.removeFavoriteHotel = {
  params: Joi.object({
    hotelId: Joi.number().integer().positive().required().messages({
      'number.base': 'hotelId must be a number',
      'number.positive': 'hotelId must be a positive number',
      'any.required': 'hotelId is required',
    }),
  }).required(),
};
