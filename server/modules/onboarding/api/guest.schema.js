const Joi = require('joi');

/**
 * Join validation schemas
 * Following RESTful API standards
 * For partner registration (become a partner)
 */

// Common validations
const hotelIdSchema = Joi.number().integer().positive().required().messages({
  'number.base': 'hotel_id must be a number',
  'number.integer': 'hotel_id must be an integer',
  'number.positive': 'hotel_id must be a positive number',
  'any.required': 'hotel_id is required',
});

const roomIdSchema = Joi.string().uuid().required().messages({
  'string.base': 'room_id must be a string',
  'string.guid': 'room_id must be a valid UUID',
  'any.required': 'room_id is required',
});

const coordinateSchema = Joi.number().min(-90).max(90).required().messages({
  'number.base': 'Must be a number',
  'number.min': 'Latitude must be between -90 and 90',
  'number.max': 'Latitude must be between -90 and 90',
  'any.required': 'Latitude is required',
});

const longitudeSchema = Joi.number().min(-180).max(180).required().messages({
  'number.base': 'Must be a number',
  'number.min': 'Longitude must be between -180 and 180',
  'number.max': 'Longitude must be between -180 and 180',
  'any.required': 'Longitude is required',
});

const timeSchema = Joi.string()
  .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  .required()
  .messages({
    'string.pattern.base': 'Time must be in HH:MM format (24-hour)',
    'any.required': 'Time is required',
  });

/**
 * POST /api/join
 * Submit join form (become a partner)
 */
exports.submitJoinForm = {
  body: Joi.object({
    joinFormData: Joi.object({
      hotelName: Joi.string().min(1).max(255).trim().required().messages({
        'string.base': 'hotelName must be a string',
        'string.min': 'hotelName must not be empty',
        'string.max': 'hotelName must not exceed 255 characters',
        'any.required': 'hotelName is required',
      }),
      streetName: Joi.string().min(1).max(500).trim().required().messages({
        'string.base': 'streetName must be a string',
        'string.min': 'streetName must not be empty',
        'string.max': 'streetName must not exceed 500 characters',
        'any.required': 'streetName is required',
      }),
      city: Joi.string().min(1).max(255).trim().required().messages({
        'string.base': 'city must be a string',
        'string.min': 'city must not be empty',
        'string.max': 'city must not exceed 255 characters',
        'any.required': 'city is required',
      }),
      coordinates: Joi.object({
        latitude: coordinateSchema,
        longitude: longitudeSchema,
      })
        .required()
        .messages({
          'any.required': 'coordinates are required',
        }),
      rating: Joi.number().min(0).max(5).optional().messages({
        'number.base': 'rating must be a number',
        'number.min': 'rating must be between 0 and 5',
        'number.max': 'rating must be between 0 and 5',
      }),
      checkInFrom: timeSchema,
      checkInTo: timeSchema,
      checkOutFrom: timeSchema,
      checkOutTo: timeSchema,
      services: Joi.array().items(Joi.string()).optional().messages({
        'array.base': 'services must be an array',
      }),
      roomDetails: Joi.object({
        roomType: Joi.string().min(1).max(255).trim().required().messages({
          'string.base': 'roomType must be a string',
          'string.min': 'roomType must not be empty',
          'string.max': 'roomType must not exceed 255 characters',
          'any.required': 'roomType is required',
        }),
        numberOfGuests: Joi.number().integer().positive().required().messages({
          'number.base': 'numberOfGuests must be a number',
          'number.integer': 'numberOfGuests must be an integer',
          'number.positive': 'numberOfGuests must be positive',
          'any.required': 'numberOfGuests is required',
        }),
        numberOfRooms: Joi.number().integer().positive().required().messages({
          'number.base': 'numberOfRooms must be a number',
          'number.integer': 'numberOfRooms must be an integer',
          'number.positive': 'numberOfRooms must be positive',
          'any.required': 'numberOfRooms is required',
        }),
      })
        .required()
        .messages({
          'any.required': 'roomDetails are required',
        }),
    })
      .required()
      .custom((value, helpers) => {
        // Validate check-in/check-out times
        if (value.checkInFrom && value.checkInTo) {
          const from = parseInt(value.checkInFrom.split(':')[0], 10);
          const to = parseInt(value.checkInTo.split(':')[0], 10);
          if (to <= from) {
            return helpers.error('any.custom', {
              message: 'checkInTo must be after checkInFrom',
            });
          }
        }

        if (value.checkOutFrom && value.checkOutTo) {
          const from = parseInt(value.checkOutFrom.split(':')[0], 10);
          const to = parseInt(value.checkOutTo.split(':')[0], 10);
          if (to <= from) {
            return helpers.error('any.custom', {
              message: 'checkOutTo must be after checkOutFrom',
            });
          }
        }

        return value;
      }),
  })
    .unknown(false)
    .custom((value, helpers) => {
      // Also support flat structure (for backward compatibility)
      if (!value.joinFormData) {
        // Check if all required fields are at root level
        const hasRequiredFields =
          value.hotelName &&
          value.streetName &&
          value.city &&
          value.coordinates &&
          value.roomDetails;

        if (hasRequiredFields) {
          // Transform flat structure to nested structure
          value.joinFormData = {
            hotelName: value.hotelName,
            streetName: value.streetName,
            city: value.city,
            coordinates: value.coordinates,
            rating: value.rating,
            checkInFrom: value.checkInFrom,
            checkInTo: value.checkInTo,
            checkOutFrom: value.checkOutFrom,
            checkOutTo: value.checkOutTo,
            services: value.services,
            roomDetails: value.roomDetails,
          };
        }
      }
      return value;
    }),
};

/**
 * POST /api/join/photos
 * Upload and process hotel/room photos
 * Note: File validation is handled by multer middleware
 */
exports.uploadPhotos = {
  body: Joi.object({
    hotel_id: hotelIdSchema,
    room_id: roomIdSchema,
  })
    .required()
    .unknown(true), // Allow other fields (files are handled by multer)
};
