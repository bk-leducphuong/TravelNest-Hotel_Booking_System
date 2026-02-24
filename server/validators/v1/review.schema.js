const Joi = require('joi');

const { pagination } = require('./common.schema');

/**
 * Review validation schemas
 * Following RESTful API standards
 */

// Common validations
const hotelIdSchema = Joi.number().integer().positive().required().messages({
  'number.base': 'hotelId must be a number',
  'number.integer': 'hotelId must be an integer',
  'number.positive': 'hotelId must be a positive number',
  'any.required': 'hotelId is required',
});

const bookingCodeSchema = Joi.string().min(1).max(100).required().messages({
  'string.base': 'bookingCode must be a string',
  'string.min': 'bookingCode must not be empty',
  'string.max': 'bookingCode must not exceed 100 characters',
  'any.required': 'bookingCode is required',
});

const ratingSchema = Joi.number().min(1).max(5).required().messages({
  'number.base': 'rating must be a number',
  'number.min': 'rating must be at least 1',
  'number.max': 'rating must be at most 5',
  'any.required': 'rating is required',
});

const commentSchema = Joi.string().min(1).max(5000).trim().required().messages({
  'string.base': 'comment must be a string',
  'string.min': 'comment must not be empty',
  'string.max': 'comment must not exceed 5000 characters',
  'any.required': 'comment is required',
});

const reviewCriteriaSchema = Joi.object({
  name: Joi.string().min(1).max(50).required().messages({
    'string.base': 'criteria name must be a string',
    'string.min': 'criteria name must not be empty',
    'string.max': 'criteria name must not exceed 50 characters',
    'any.required': 'criteria name is required',
  }),
  value: Joi.number().integer().min(1).max(5).required().messages({
    'number.base': 'criteria value must be a number',
    'number.integer': 'criteria value must be an integer',
    'number.min': 'criteria value must be at least 1',
    'number.max': 'criteria value must be at most 5',
    'any.required': 'criteria value is required',
  }),
});

/**
 * GET /api/reviews
 * Get all reviews for authenticated user
 */
exports.getUserReviews = {
  query: Joi.object({}).unknown(false), // No query params expected
};

/**
 * GET /api/reviews/hotels/:hotelId
 * Get reviews for a specific hotel
 */
exports.getHotelReviews = {
  params: Joi.object({
    hotelId: hotelIdSchema,
  }).required(),
  query: Joi.object({
    ...pagination,
  }),
};

/**
 * GET /api/reviews/validate
 * Validate if user can review a booking
 */
exports.validateReview = {
  query: Joi.object({
    bookingCode: bookingCodeSchema,
    hotelId: hotelIdSchema,
  }).required(),
};

/**
 * GET /api/reviews/check
 * Check if booking has already been reviewed
 */
exports.checkAlreadyReviewed = {
  query: Joi.object({
    bookingCode: bookingCodeSchema,
    hotelId: hotelIdSchema,
  }).required(),
};

/**
 * POST /api/reviews
 * Create a review
 */
exports.createReview = {
  body: Joi.object({
    hotelId: hotelIdSchema,
    rating: ratingSchema,
    comment: commentSchema,
    reviewCriteria: Joi.array().items(reviewCriteriaSchema).min(1).required().messages({
      'array.base': 'reviewCriteria must be an array',
      'array.min': 'At least one review criteria is required',
      'any.required': 'reviewCriteria is required',
    }),
    bookingCode: bookingCodeSchema,
  }).required(),
};
