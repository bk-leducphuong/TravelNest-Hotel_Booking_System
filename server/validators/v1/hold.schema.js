const Joi = require('joi');

/**
 * Hold validation schemas
 * POST /api/hold - create temporary room hold during checkout
 * GET /api/hold - list active holds for user
 * GET /api/hold/:holdId - get hold by id
 * DELETE /api/hold/:holdId - release hold
 */

const uuidSchema = Joi.string().uuid().required().messages({
  'string.guid': 'Must be a valid UUID',
  'any.required': 'This field is required',
});

const dateSchema = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .messages({
    'string.pattern.base': 'Date must be YYYY-MM-DD',
  });

const roomEntrySchema = Joi.object({
  roomId: Joi.string().uuid().required().messages({
    'string.guid': 'roomId must be a valid UUID',
    'any.required': 'roomId is required',
  }),
  quantity: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'quantity must be a number',
    'number.integer': 'quantity must be an integer',
    'number.min': 'quantity must be at least 1',
  }),
});

/**
 * POST /api/hold - Create hold
 * Body: hotelId, checkInDate, checkOutDate, numberOfGuests, rooms: [{ roomId, quantity }]
 */
exports.createHold = {
  body: Joi.object({
    hotelId: uuidSchema.messages({
      'any.required': 'hotelId is required',
    }),
    checkInDate: dateSchema.required().messages({
      'any.required': 'checkInDate is required',
    }),
    checkOutDate: dateSchema.required().messages({
      'any.required': 'checkOutDate is required',
    }),
    numberOfGuests: Joi.number().integer().min(1).default(1).messages({
      'number.base': 'numberOfGuests must be a number',
      'number.integer': 'numberOfGuests must be an integer',
      'number.min': 'numberOfGuests must be at least 1',
    }),
    numberOfDays: Joi.number().integer().min(1).optional(),
    rooms: Joi.array()
      .items(roomEntrySchema)
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one room is required',
        'any.required': 'rooms is required',
      }),
    currency: Joi.string().length(3).uppercase().default('USD'),
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
 * GET /api/hold/:holdId - Get hold by id
 */
exports.getHoldById = {
  params: Joi.object({
    holdId: uuidSchema.messages({
      'any.required': 'holdId is required',
    }),
  }).required(),
};

/**
 * DELETE /api/hold/:holdId - Release hold
 */
exports.releaseHold = {
  params: Joi.object({
    holdId: uuidSchema.messages({
      'any.required': 'holdId is required',
    }),
  }).required(),
};
