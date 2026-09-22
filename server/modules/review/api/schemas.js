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
  query: Joi.object({ ...paginationQuery }).unknown(false),
};

const getUserReviews = {
  query: Joi.object({ ...paginationQuery }).unknown(false),
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
  adminListReviews,
  adminGetReview,
  adminReviewSummary,
  adminSetStatus,
  adminReply,
};
