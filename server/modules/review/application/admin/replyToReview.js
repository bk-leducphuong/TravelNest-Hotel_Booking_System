const ApiError = require('@utils/ApiError');
const { eventBus, DOMAIN_EVENTS } = require('@platform/events');
const { auditService } = require('@platform/audit');

const reviewRepository = require('../../infrastructure/review.repository');

function normalizeReply(reply) {
  const text = String(reply || '').trim();
  if (!text) {
    throw new ApiError(400, 'MISSING_REPLY', 'reply is required');
  }
  return text;
}

/**
 * Hotel owner/manager replies to a review (one reply per review).
 */
async function replyToReview(reviewId, { reply, actorUserId, requestId }) {
  const review = await reviewRepository.findById(reviewId);

  if (!review) {
    throw new ApiError(404, 'REVIEW_NOT_FOUND', 'Review not found');
  }

  const existingReply = await reviewRepository.findReplyByReviewId(reviewId);
  if (existingReply) {
    throw new ApiError(409, 'REVIEW_REPLY_EXISTS', 'This review already has a reply');
  }

  const replyText = normalizeReply(reply);
  const created = await reviewRepository.createReply({
    reviewId,
    userId: actorUserId,
    replyText,
  });

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'review.replied',
    entityType: 'review',
    entityId: reviewId,
    hotelId: review.hotel_id,
    after: { reply: replyText },
    requestId,
  });

  await eventBus.publish(DOMAIN_EVENTS.REVIEW_REPLIED, {
    reviewId,
    hotelId: review.hotel_id,
  });

  return { replyId: created.id, reviewId, reply: replyText };
}

async function updateReply(reviewId, { reply, actorUserId, requestId }) {
  const review = await reviewRepository.findById(reviewId);

  if (!review) {
    throw new ApiError(404, 'REVIEW_NOT_FOUND', 'Review not found');
  }

  const existingReply = await reviewRepository.findReplyByReviewId(reviewId);
  if (!existingReply) {
    throw new ApiError(404, 'REVIEW_REPLY_NOT_FOUND', 'This review has no reply to update');
  }

  const replyText = normalizeReply(reply);
  await reviewRepository.updateReply(reviewId, replyText);

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'review.reply_updated',
    entityType: 'review',
    entityId: reviewId,
    hotelId: review.hotel_id,
    before: { reply: existingReply.reply_text },
    after: { reply: replyText },
    requestId,
  });

  return { reviewId, reply: replyText };
}

async function deleteReply(reviewId, { actorUserId, requestId } = {}) {
  const review = await reviewRepository.findById(reviewId);

  if (!review) {
    throw new ApiError(404, 'REVIEW_NOT_FOUND', 'Review not found');
  }

  const deleted = await reviewRepository.deleteReply(reviewId);
  if (!deleted) {
    throw new ApiError(404, 'REVIEW_REPLY_NOT_FOUND', 'This review has no reply to delete');
  }

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'review.reply_deleted',
    entityType: 'review',
    entityId: reviewId,
    hotelId: review.hotel_id,
    requestId,
  });

  return { reviewId, deleted: true };
}

module.exports = { replyToReview, updateReply, deleteReply };
