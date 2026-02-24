const Joi = require('joi');

/**
 * Admin Booking validation schemas
 * Following RESTful API standards
 */

// Common validations
const hotelIdSchema = Joi.string().uuid().required().messages({
  'string.base': 'hotelId must be a string',
  'string.guid': 'hotelId must be a valid UUID',
  'any.required': 'hotelId is required',
});

const bookingIdSchema = Joi.string().uuid().required().messages({
  'string.base': 'bookingId must be a string',
  'string.guid': 'bookingId must be a valid UUID',
  'any.required': 'bookingId is required',
});

const buyerIdSchema = Joi.string().uuid().required().messages({
  'string.base': 'buyerId must be a string',
  'string.guid': 'buyerId must be a valid UUID',
  'any.required': 'buyerId is required',
});

/**
 * GET /api/admin/bookings
 * Get all bookings for a specific hotel
 */
exports.getAllBookings = {
  query: Joi.object({
    hotelId: hotelIdSchema,
    status: Joi.string()
      .valid('pending', 'confirmed', 'checked in', 'completed', 'cancelled')
      .messages({
        'any.only': 'status must be one of: pending, confirmed, checked in, completed, cancelled',
      }),
    page: Joi.number().integer().min(1).default(1).messages({
      'number.base': 'page must be a number',
      'number.integer': 'page must be an integer',
      'number.min': 'page must be at least 1',
    }),
    limit: Joi.number().integer().min(1).max(100).default(20).messages({
      'number.base': 'limit must be a number',
      'number.integer': 'limit must be an integer',
      'number.min': 'limit must be at least 1',
      'number.max': 'limit must not exceed 100',
    }),
  }),
};

/**
 * GET /api/admin/bookings/:bookingId
 * Get a specific booking by ID
 */
exports.getBookingById = {
  params: Joi.object({
    bookingId: bookingIdSchema,
  }).required(),
  query: Joi.object({}).unknown(false),
};

/**
 * GET /api/admin/bookings/:bookingId/booker
 * Get booker information for a specific booking
 */
exports.getBookerInformation = {
  params: Joi.object({
    bookingId: bookingIdSchema,
  }).required(),
  query: Joi.object({}).unknown(false),
};

/**
 * PATCH /api/admin/bookings/:bookingId/status
 * Update booking status
 */
exports.updateBookingStatus = {
  params: Joi.object({
    bookingId: bookingIdSchema,
  }).required(),
  body: Joi.object({
    status: Joi.string()
      .valid('pending', 'confirmed', 'checked in', 'completed', 'cancelled')
      .required()
      .messages({
        'any.only': 'status must be one of: pending, confirmed, checked in, completed, cancelled',
        'any.required': 'status is required',
      }),
  }).required(),
};
