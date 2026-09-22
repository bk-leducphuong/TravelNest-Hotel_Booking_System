const ApiError = require('@utils/ApiError');
const { eventBus, DOMAIN_EVENTS } = require('@platform/events');
const { auditService } = require('@platform/audit');

const reviewRepository = require('../../infrastructure/review.repository');
const { assertTransition } = require('../../domain/review-status');

/**
 * Moderator action: publish / hide / delete a review.
 */
async function setReviewStatus(reviewId, { status, reason, actorUserId, requestId }) {
  const review = await reviewRepository.findById(reviewId);

  if (!review) {
    throw new ApiError(404, 'REVIEW_NOT_FOUND', 'Review not found');
  }

  const previousStatus = review.status;
  assertTransition(previousStatus, status);

  await reviewRepository.updateStatus(reviewId, status);

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'review.status_changed',
    entityType: 'review',
    entityId: reviewId,
    hotelId: review.hotel_id,
    before: { status: previousStatus },
    after: { status },
    reason,
    requestId,
  });

  await eventBus.publish(DOMAIN_EVENTS.REVIEW_STATUS_CHANGED, {
    reviewId,
    hotelId: review.hotel_id,
    from: previousStatus,
    to: status,
  });

  return {
    reviewId,
    previousStatus,
    status,
  };
}

module.exports = { setReviewStatus };
