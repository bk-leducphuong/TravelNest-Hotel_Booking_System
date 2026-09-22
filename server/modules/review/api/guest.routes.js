const express = require('express');

const { authenticate, optionalAuthenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');

const schema = require('./schemas');
const controller = require('./guest.controller');

const router = express.Router();

/**
 * Guest-facing review routes (mounted at /api/v1/reviews).
 */

// Public: published reviews for a hotel
router.get(
  '/hotels/:hotelId',
  optionalAuthenticate,
  validate(schema.getHotelReviews),
  controller.getHotelReviews
);

// My reviews
router.get('/', authenticate, validate(schema.getUserReviews), controller.getUserReviews);

// Review eligibility helpers
router.get('/validate', authenticate, validate(schema.validateReview), controller.validateReview);
router.get('/check', authenticate, validate(schema.checkAlreadyReviewed), controller.checkReview);

// Create a review for a completed booking
router.post('/', authenticate, validate(schema.createReview), controller.postReview);

module.exports = router;
