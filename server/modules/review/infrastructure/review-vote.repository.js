const { Op } = require('sequelize');

const {
  reviews: Reviews,
  review_helpful_votes: ReviewHelpfulVotes,
} = require('@platform/database');
const sequelize = require('@config/database.config');

/**
 * Helpful / not-helpful votes on reviews (one row per user per review).
 *
 * Split out of `review.repository` so each repository owns a single table
 * family, and `applyHelpfulVote` writes the denormalised `reviews.helpful_count`
 * inside a transaction.
 */
class ReviewVoteRepository {
  /**
   * Light lookup used before casting a helpful vote: we only need to confirm
   * the review is published and to reject voting on your own review.
   */
  async findVoteTarget(reviewId) {
    return await Reviews.findOne({
      where: { id: reviewId },
      attributes: ['id', 'user_id', 'status'],
    });
  }

  /**
   * The current user's votes for a page of reviews, keyed by review id.
   */
  async findVotesByReviewIds(reviewIds = [], userId) {
    if (!userId || !Array.isArray(reviewIds) || reviewIds.length === 0) {
      return [];
    }

    return await ReviewHelpfulVotes.findAll({
      where: { review_id: { [Op.in]: reviewIds }, user_id: userId },
      attributes: ['review_id', 'is_helpful'],
      raw: true,
    });
  }

  /**
   * Create/update the user's vote and recompute the denormalised
   * `reviews.helpful_count` (the number of `is_helpful = true` votes).
   */
  async applyHelpfulVote({ reviewId, userId, isHelpful }) {
    return await sequelize.transaction(async (transaction) => {
      await ReviewHelpfulVotes.upsert(
        { review_id: reviewId, user_id: userId, is_helpful: isHelpful },
        { transaction }
      );

      const helpfulCount = await ReviewHelpfulVotes.count({
        where: { review_id: reviewId, is_helpful: true },
        transaction,
      });

      await Reviews.update(
        { helpful_count: helpfulCount },
        { where: { id: reviewId }, transaction }
      );

      return helpfulCount;
    });
  }

  /**
   * Remove the user's vote (if any) and recompute `reviews.helpful_count`.
   */
  async removeHelpfulVote({ reviewId, userId }) {
    return await sequelize.transaction(async (transaction) => {
      await ReviewHelpfulVotes.destroy({
        where: { review_id: reviewId, user_id: userId },
        transaction,
      });

      const helpfulCount = await ReviewHelpfulVotes.count({
        where: { review_id: reviewId, is_helpful: true },
        transaction,
      });

      await Reviews.update(
        { helpful_count: helpfulCount },
        { where: { id: reviewId }, transaction }
      );

      return helpfulCount;
    });
  }
}

module.exports = new ReviewVoteRepository();
