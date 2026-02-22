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
 * Get hotel details with optional search parameters
 */
exports.getHotelDetails = {
  params: Joi.object({
    hotelId: hotelIdSchema,
  }).required(),
  query: Joi.object({
    checkInDate: dateSchema,
    checkOutDate: dateSchema,
    numberOfDays: positiveIntegerSchema,
    numberOfRooms: positiveIntegerSchema,
    numberOfGuests: positiveIntegerSchema,
  }).custom((value, helpers) => {
    // If any date-related fields are provided, all date fields should be provided
    const hasDateFields =
      value.checkInDate || value.checkOutDate || value.numberOfDays;
    if (hasDateFields) {
      if (!value.checkInDate || !value.checkOutDate || !value.numberOfDays) {
        return helpers.error('any.custom', {
          message:
            'If date search is used, checkInDate, checkOutDate, and numberOfDays are all required',
        });
      }
      // Validate that checkOutDate is after checkInDate
      const checkIn = new Date(value.checkInDate);
      const checkOut = new Date(value.checkOutDate);
      if (checkOut <= checkIn) {
        return helpers.error('any.custom', {
          message: 'checkOutDate must be after checkInDate',
        });
      }
      // Validate that numberOfDays matches the date range
      const daysDiff = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      if (parseInt(value.numberOfDays, 10) !== daysDiff) {
        return helpers.error('any.custom', {
          message:
            'numberOfDays must match the difference between checkInDate and checkOutDate',
        });
      }
    }
    return value;
  }),
};

/**
 * GET /api/hotels/:hotelId/rooms
 * Search available rooms for a hotel
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
    numberOfDays: positiveIntegerSchema.required().messages({
      'any.required': 'numberOfDays is required',
    }),
    numberOfRooms: positiveIntegerSchema.default(1),
    numberOfGuests: positiveIntegerSchema,
    ...pagination,
  })
    .required()
    .custom((value, helpers) => {
      // Validate that checkOutDate is after checkInDate
      const checkIn = new Date(value.checkInDate);
      const checkOut = new Date(value.checkOutDate);
      if (checkOut <= checkIn) {
        return helpers.error('any.custom', {
          message: 'checkOutDate must be after checkInDate',
        });
      }
      // Validate that numberOfDays matches the date range
      const daysDiff = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      if (parseInt(value.numberOfDays, 10) !== daysDiff) {
        return helpers.error('any.custom', {
          message:
            'numberOfDays must match the difference between checkInDate and checkOutDate',
        });
      }
      return value;
    }),
};

/**
 * GET /api/hotels/:hotelId/rooms/availability
 * Check room availability for specific rooms
 */
exports.checkRoomAvailability = {
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
    numberOfDays: positiveIntegerSchema.required().messages({
      'any.required': 'numberOfDays is required',
    }),
    numberOfGuests: positiveIntegerSchema,
    selectedRooms: Joi.alternatives()
      .try(
        Joi.string().custom((value, helpers) => {
          try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) {
              return helpers.error('any.custom', {
                message: 'selectedRooms must be a JSON array',
              });
            }
            if (parsed.length === 0) {
              return helpers.error('any.custom', {
                message: 'At least one room must be selected',
              });
            }
            // Validate each room object
            const roomSchema = Joi.object({
              room_id: Joi.string().uuid().required(),
              roomQuantity: Joi.number().integer().positive().required(),
            });
            for (const room of parsed) {
              const { error } = roomSchema.validate(room);
              if (error) {
                return helpers.error('any.custom', {
                  message: `Invalid room object: ${error.message}`,
                });
              }
            }
            return parsed;
          } catch (e) {
            return helpers.error('any.custom', {
              message: 'selectedRooms must be a valid JSON array',
            });
          }
        }),
        Joi.array()
          .items(
            Joi.object({
              room_id: Joi.number().integer().positive().required().messages({
                'number.base': 'room_id must be a number',
                'number.integer': 'room_id must be an integer',
                'number.positive': 'room_id must be a positive number',
                'any.required': 'room_id is required',
              }),
              roomQuantity: Joi.number()
                .integer()
                .positive()
                .required()
                .messages({
                  'number.base': 'roomQuantity must be a number',
                  'number.integer': 'roomQuantity must be an integer',
                  'number.positive': 'roomQuantity must be a positive number',
                  'any.required': 'roomQuantity is required',
                }),
            })
          )
          .min(1)
          .required()
          .messages({
            'array.min': 'At least one room must be selected',
            'any.required': 'selectedRooms is required',
          })
      )
      .required()
      .messages({
        'any.required': 'selectedRooms is required',
      }),
  })
    .required()
    .custom((value, helpers) => {
      // Validate that checkOutDate is after checkInDate
      const checkIn = new Date(value.checkInDate);
      const checkOut = new Date(value.checkOutDate);
      if (checkOut <= checkIn) {
        return helpers.error('any.custom', {
          message: 'checkOutDate must be after checkInDate',
        });
      }
      // Validate that numberOfDays matches the date range
      const daysDiff = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      if (parseInt(value.numberOfDays, 10) !== daysDiff) {
        return helpers.error('any.custom', {
          message:
            'numberOfDays must match the difference between checkInDate and checkOutDate',
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
