const express = require('express');

const { authenticate, requirePermission } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const { PERMISSIONS } = require('@constants/permissions');

const schema = require('./schemas');
const controller = require('./admin.controller');

const router = express.Router();

// Reviews are scoped to a hotel (platform staff may omit it for global moderation).
const requireHotelPermission = (permission) =>
  requirePermission(permission, { requireHotelContext: true });

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
  controller.getReviewHandler
);

// Moderation action
router.patch(
  '/:reviewId/status',
  requireHotelPermission(PERMISSIONS.REVIEW_MODERATE),
  validate(schema.adminSetStatus),
  controller.setReviewStatusHandler
);

// Hotel owner/manager replies
router.post(
  '/:reviewId/reply',
  requireHotelPermission(PERMISSIONS.REVIEW_REPLY),
  validate(schema.adminReply),
  controller.replyToReviewHandler
);

router.patch(
  '/:reviewId/reply',
  requireHotelPermission(PERMISSIONS.REVIEW_REPLY),
  validate(schema.adminReply),
  controller.updateReplyHandler
);

router.delete(
  '/:reviewId/reply',
  requireHotelPermission(PERMISSIONS.REVIEW_REPLY),
  validate(schema.adminGetReview),
  controller.deleteReplyHandler
);

module.exports = router;
