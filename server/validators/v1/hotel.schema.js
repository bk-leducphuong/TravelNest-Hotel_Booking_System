const Joi = require('joi');

const { pagination } = require('./common.schema');

/**
 * Hotel validation schemas
 * Following RESTful API standards
 */

// Common validations
const hotelIdSchema = Joi.string().uuid().required().messages({
  'string.base': 'hotelId must be a string',
  'string.guid': 'hotelId must be a valid UUID',
  'any.required': 'hotelId is required',
});

const dateSchema = Joi.string().isoDate().messages({
  'string.isoDate': 'Date must be in ISO 8601 format (YYYY-MM-DD)',
});

const positiveIntegerSchema = Joi.number().integer().positive().messages({
  'number.base': 'Must be a number',
  'number.integer': 'Must be an integer',
  'number.positive': 'Must be a positive number',
});

/**
 * GET /api/hotels/:hotelId
 * Get hotel details with optional search parameters.
 * When checkInDate and checkOutDate are provided, numberOfNights is inferred (checkOut - checkIn).
 */
exports.getHotelDetails = {
  params: Joi.object({
    hotelId: hotelIdSchema,
  }).required(),
  query: Joi.object({
    checkInDate: dateSchema,
    checkOutDate: dateSchema,
    numberOfRooms: positiveIntegerSchema.default(1),
    numberOfGuests: positiveIntegerSchema,
  }).custom((value, helpers) => {
    // If either date is provided, both are required
    const hasDateFields = value.checkInDate || value.checkOutDate;
    if (hasDateFields) {
      if (!value.checkInDate || !value.checkOutDate) {
        return helpers.error('any.custom', {
          message: 'If date search is used, both checkInDate and checkOutDate are required',
        });
      }
      const checkIn = new Date(value.checkInDate);
      const checkOut = new Date(value.checkOutDate);
      if (checkOut <= checkIn) {
        return helpers.error('any.custom', {
          message: 'checkOutDate must be after checkInDate',
        });
      }
    }
    return value;
  }),
};

/**
 * GET /api/hotels/:hotelId/rooms
 * Search available rooms for a hotel.
 * numberOfNights is inferred from checkInDate and checkOutDate (checkOut - checkIn).
 */
exports.searchRooms = {
  params: Joi.object({
    hotelId: hotelIdSchema,
  }).required(),
  query: Joi.object({
    checkInDate: dateSchema.required().messages({
      'any.required': 'checkInDate is required',
    }),
    checkOutDate: dateSchema.required().messages({
      'any.required': 'checkOutDate is required',
    }),
    numberOfRooms: positiveIntegerSchema.default(1),
    numberOfGuests: positiveIntegerSchema,
    ...pagination,
  })
    .required()
    .custom((value, helpers) => {
      const checkIn = new Date(value.checkInDate);
      const checkOut = new Date(value.checkOutDate);
      if (checkOut <= checkIn) {
        return helpers.error('any.custom', {
          message: 'checkOutDate must be after checkInDate',
        });
      }
      return value;
    }),
};

/**
 * GET /api/hotels/:hotelId/policies
 * Get all policies for a hotel
 */
exports.getHotelPolicies = {
  params: Joi.object({
    hotelId: hotelIdSchema,
  }).required(),
};

/**
 * GET /api/hotels/:hotelId/nearby-places
 * Get nearby places for a hotel
 */
exports.getNearbyPlaces = {
  params: Joi.object({
    hotelId: hotelIdSchema,
  }).required(),
  query: Joi.object({
    category: Joi.string()
      .valid(
        'restaurant',
        'cafe',
        'bar',
        'shopping',
        'attraction',
        'museum',
        'park',
        'beach',
        'airport',
        'train_station',
        'bus_station',
        'hospital',
        'pharmacy',
        'bank',
        'atm',
        'gas_station',
        'parking',
        'gym',
        'spa',
        'entertainment',
        'landmark',
        'religious',
        'school',
        'other'
      )
      .optional()
      .messages({
        'any.only': 'Invalid category',
      }),
    limit: Joi.number().integer().min(1).max(100).default(20).messages({
      'number.base': 'limit must be a number',
      'number.integer': 'limit must be an integer',
      'number.min': 'limit must be at least 1',
      'number.max': 'limit cannot exceed 100',
    }),
  }).optional(),
};
