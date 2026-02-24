const Joi = require('joi');

const { pagination } = require('./common.schema');

/**
 * Payment validation schemas
 * Following RESTful API standards
 */

// Common validations
const bookingIdSchema = Joi.number().integer().positive().required().messages({
  'number.base': 'bookingId must be a number',
  'number.integer': 'bookingId must be an integer',
  'number.positive': 'bookingId must be a positive number',
  'any.required': 'bookingId is required',
});

const transactionIdSchema = Joi.number().integer().positive().required().messages({
  'number.base': 'transactionId must be a number',
  'number.integer': 'transactionId must be an integer',
  'number.positive': 'transactionId must be a positive number',
  'any.required': 'transactionId is required',
});

const paymentMethodIdSchema = Joi.string().min(1).required().messages({
  'string.base': 'paymentMethodId must be a string',
  'string.min': 'paymentMethodId must not be empty',
  'any.required': 'paymentMethodId is required',
});

const amountSchema = Joi.number().positive().required().messages({
  'number.base': 'amount must be a number',
  'number.positive': 'amount must be positive',
  'any.required': 'amount is required',
});

const currencySchema = Joi.string().length(3).uppercase().required().messages({
  'string.base': 'currency must be a string',
  'string.length': 'currency must be a 3-letter code (e.g., USD)',
  'any.required': 'currency is required',
});

const bookingDetailsSchema = Joi.object({
  bookingCode: Joi.string().min(1).max(100).required().messages({
    'string.base': 'bookingCode must be a string',
    'string.min': 'bookingCode must not be empty',
    'string.max': 'bookingCode must not exceed 100 characters',
    'any.required': 'bookingCode is required',
  }),
  hotelId: Joi.number().integer().positive().required().messages({
    'number.base': 'hotelId must be a number',
    'number.integer': 'hotelId must be an integer',
    'number.positive': 'hotelId must be a positive number',
    'any.required': 'hotelId is required',
  }),
  checkInDate: Joi.string().isoDate().required().messages({
    'string.isoDate': 'checkInDate must be in ISO 8601 format (YYYY-MM-DD)',
    'any.required': 'checkInDate is required',
  }),
  checkOutDate: Joi.string().isoDate().required().messages({
    'string.isoDate': 'checkOutDate must be in ISO 8601 format (YYYY-MM-DD)',
    'any.required': 'checkOutDate is required',
  }),
  numberOfGuests: Joi.number().integer().positive().required().messages({
    'number.base': 'numberOfGuests must be a number',
    'number.integer': 'numberOfGuests must be an integer',
    'number.positive': 'numberOfGuests must be positive',
    'any.required': 'numberOfGuests is required',
  }),
  bookedRooms: Joi.array()
    .items(
      Joi.object({
        room_id: Joi.string().uuid().required(),
        roomQuantity: Joi.number().integer().positive().required(),
      })
    )
    .min(1)
    .optional()
    .messages({
      'array.base': 'bookedRooms must be an array',
      'array.min': 'At least one room must be booked',
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
    return value;
  });

/**
 * GET /api/payments
 * Get all payments for authenticated user
 */
exports.getUserPayments = {
  query: Joi.object({
    ...pagination,
  }),
};

/**
 * POST /api/payments
 * Create a payment intent for booking using the current active hold
 */
exports.createPaymentIntent = {
  body: Joi.object({
    paymentMethodId: paymentMethodIdSchema,
    currency: currencySchema.optional(),
  }).required(),
};

/**
 * GET /api/payments/bookings/:bookingId
 * Get payment information by booking ID
 */
exports.getPaymentByBookingId = {
  params: Joi.object({
    bookingId: bookingIdSchema,
  }).required(),
  query: Joi.object({}).unknown(false), // No query params expected
};

/**
 * GET /api/payments/transactions/:transactionId
 * Get payment information by transaction ID
 */
exports.getPaymentByTransactionId = {
  params: Joi.object({
    transactionId: transactionIdSchema,
  }).required(),
  query: Joi.object({}).unknown(false), // No query params expected
};
