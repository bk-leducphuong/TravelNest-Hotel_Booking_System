const reviewRepository = require('../../infrastructure/review.repository');

/**
 * Moderation stats for one hotel.
 */
async function getReviewSummary(hotelId) {
  const rows = await reviewRepository.findStatusAndRatingRows(hotelId);

  const byStatus = { published: 0, hidden: 0, deleted: 0 };
  let ratingSum = 0;
  let ratingCount = 0;

  for (const row of rows) {
    if (byStatus[row.status] !== undefined) {
      byStatus[row.status] += 1;
    }
    if (row.status === 'published') {
      const rating = parseFloat(row.rating_overall);
      if (Number.isFinite(rating)) {
        ratingSum += rating;
        ratingCount += 1;
      }
    }
  }

  const repliedCount = await reviewRepository.countRepliesForHotel(hotelId);

  return {
    hotelId,
    totalReviews: rows.length,
    byStatus,
    publishedCount: byStatus.published,
    averageRating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 100) / 100 : 0,
    repliedCount,
    unrepliedCount: byStatus.published - repliedCount,
  };
}

module.exports = { getReviewSummary };
