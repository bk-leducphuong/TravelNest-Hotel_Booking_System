const express = require('express');

const {
  authenticate,
  requirePermission,
  requireEntityInHotel,
} = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const { PERMISSIONS } = require('@constants/permissions');
const { Reviews } = require('@platform/database');

const schema = require('./schemas');
const controller = require('./admin.controller');

const router = express.Router();

// Reviews are scoped to a hotel (platform staff may omit it for global moderation).
const requireHotelPermission = (permission) =>
  requirePermission(permission, { requireHotelContext: true });

// `/reviews/:reviewId*` has no hotelId in the path, so assert the review belongs
// to the caller's hotel context (closes the cross-hotel IDOR).
const reviewInHotel = requireEntityInHotel(async (req) => {
  const review = await Reviews.findOne({
    where: { id: req.params.reviewId },
    attributes: ['hotel_id'],
  });
  return review?.hotel_id;
});

/**
 * Admin/back-office review routes (mounted at /api/v1/admin/reviews).
 * Every route requires a bearer token and an explicit permission.
 */
router.use(authenticate);

// Moderation queue
router.get(
  '/',
  requireHotelPermission(PERMISSIONS.REVIEW_READ),
  validate(schema.adminListReviews),
  controller.listReviewsHandler
);

router.get(
  '/summary',
  requireHotelPermission(PERMISSIONS.REVIEW_READ),
  validate(schema.adminReviewSummary),
  controller.getReviewSummaryHandler
);

router.get(
  '/:reviewId',
  requireHotelPermission(PERMISSIONS.REVIEW_READ),
  validate(schema.adminGetReview),
  reviewInHotel,
  controller.getReviewHandler
);

// Moderation action
router.patch(
  '/:reviewId/status',
  requireHotelPermission(PERMISSIONS.REVIEW_MODERATE),
  validate(schema.adminSetStatus),
  reviewInHotel,
  controller.setReviewStatusHandler
);

// Hotel owner/manager replies
router.post(
  '/:reviewId/reply',
  requireHotelPermission(PERMISSIONS.REVIEW_REPLY),
  validate(schema.adminReply),
  reviewInHotel,
  controller.replyToReviewHandler
);

router.patch(
  '/:reviewId/reply',
  requireHotelPermission(PERMISSIONS.REVIEW_REPLY),
  validate(schema.adminReply),
  reviewInHotel,
  controller.updateReplyHandler
);

router.delete(
  '/:reviewId/reply',
  requireHotelPermission(PERMISSIONS.REVIEW_REPLY),
  validate(schema.adminGetReview),
  reviewInHotel,
  controller.deleteReplyHandler
);

module.exports = router;
