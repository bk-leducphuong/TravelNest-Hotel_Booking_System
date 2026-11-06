const Joi = require('joi');

/**
 * Review module validation schemas.
 *
 * IDs are UUIDs (matching the models) and ratings use the canonical 1-10 scale.
 */

const uuid = Joi.string().uuid({ version: ['uuidv4', 'uuidv5', 'uuidv7'] });
const paginationQuery = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};
const rating = Joi.number().min(1).max(10);

const getHotelReviews = {
  params: Joi.object({
    hotelId: uuid.required(),
  }).required(),
  query: Joi.object({
    ...paginationQuery,
    // Score band (ratings use the canonical 1-10 scale).
    minRating: Joi.number().min(1).max(10),
    maxRating: Joi.number().min(1).max(10),
    // Comma-separated month numbers, e.g. "3,4,5".
    months: Joi.string()
      .pattern(/^(1[0-2]|[1-9])(,(1[0-2]|[1-9]))*$/)
      .message('"months" must be a comma-separated list of month numbers (1-12)'),
    country: Joi.string().min(1).max(100),
    hasMedia: Joi.boolean().truthy('true').falsy('false'),
    q: Joi.string().min(1).max(100),
  }).unknown(false),
};

const getUserReviews = {
  query: Joi.object({
    ...paginationQuery,
    // Narrow the user's own reviews to a single moderation state.
    status: Joi.string().valid('published', 'hidden').optional(),
  }).unknown(false),
};

const eligibilityQuery = {
  query: Joi.object({
    bookingCode: Joi.string().min(1).max(100).required(),
    hotelId: uuid.required(),
  }).required(),
};

const createReview = {
  body: Joi.object({
    hotelId: uuid.required(),
    bookingCode: Joi.string().min(1).max(100).required(),
    ratings: Joi.object({
      overall: rating.required(),
      cleanliness: rating,
      location: rating,
      service: rating,
      value: rating,
    }).required(),
    title: Joi.string().max(150).allow('', null),
    comment: Joi.string().min(1).max(5000).required(),
  }).required(),
};

const adminListReviews = {
  query: Joi.object({
    status: Joi.string().valid('published', 'hidden', 'deleted'),
    hotelId: uuid,
    minRating: rating,
    maxRating: rating,
    hasReply: Joi.boolean(),
    q: Joi.string().max(200),
    ...paginationQuery,
  }).unknown(false),
};

const adminGetReview = {
  params: Joi.object({ reviewId: uuid.required() }).required(),
};

const castReviewVote = {
  params: Joi.object({ reviewId: uuid.required() }).required(),
  body: Joi.object({
    isHelpful: Joi.boolean().required(),
  }).required(),
};

const removeReviewVote = {
  params: Joi.object({ reviewId: uuid.required() }).required(),
};

const adminReviewSummary = {
  query: Joi.object({ hotelId: uuid.required() }).required(),
};

const adminSetStatus = {
  params: Joi.object({ reviewId: uuid.required() }).required(),
  body: Joi.object({
    status: Joi.string().valid('published', 'hidden', 'deleted').required(),
    reason: Joi.string().max(1000).allow('', null),
  }).required(),
};

const adminReply = {
  params: Joi.object({ reviewId: uuid.required() }).required(),
  body: Joi.object({
    reply: Joi.string().min(1).max(2000).required(),
  }).required(),
};

module.exports = {
  getHotelReviews,
  getUserReviews,
  validateReview: eligibilityQuery,
  checkAlreadyReviewed: eligibilityQuery,
  createReview,
  castReviewVote,
  removeReviewVote,
  adminListReviews,
  adminGetReview,
  adminReviewSummary,
  adminSetStatus,
  adminReply,
};
