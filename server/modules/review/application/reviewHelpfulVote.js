const ApiError = require('@utils/ApiError');

const reviewRepository = require('../infrastructure/review.repository');

/**
 * Confirms the review exists, is published and is not the caller's own review.
 * You may not vote on your own review.
 */
async function assertVotableReview(reviewId, userId) {
  const review = await reviewRepository.findVoteTarget(reviewId);

  if (!review || review.status !== 'published') {
    throw new ApiError(404, 'REVIEW_NOT_FOUND', 'Review not found');
  }

  if (review.user_id === userId) {
    throw new ApiError(400, 'CANNOT_VOTE_OWN_REVIEW', 'You cannot vote on your own review');
  }

  return review;
}

/**
 * Cast or change the caller's helpful/not-helpful vote on a review.
 * Returns the updated state plus the recomputed helpful count.
 */
async function castReviewVote(userId, reviewId, isHelpful) {
  await assertVotableReview(reviewId, userId);

  const helpfulCount = await reviewRepository.applyHelpfulVote({ reviewId, userId, isHelpful });

  return { isHelpful, helpfulCount };
}

/**
 * Remove the caller's vote from a review (idempotent).
 */
async function removeReviewVote(userId, reviewId) {
  await assertVotableReview(reviewId, userId);

  const helpfulCount = await reviewRepository.removeHelpfulVote({ reviewId, userId });

  return { isHelpful: null, helpfulCount };
}

module.exports = { castReviewVote, removeReviewVote };
