const reviewRepository = require('../infrastructure/review.repository');

/**
 * Shape a review row for the client: expose the hotel's active image object
 * keys as `image_urls` (primary first) so the card thumbnail resolves via
 * `getFirstImageUrl`, mirroring the booking formatter used elsewhere.
 */
function serializeReview(review) {
  const data = review.toJSON ? review.toJSON() : review;
  if (!data.hotel) return data;

  const images = Array.isArray(data.hotel.images) ? data.hotel.images : [];
  const sorted = [...images].sort(
    (a, b) =>
      (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) ||
      (a.display_order || 0) - (b.display_order || 0)
  );

  const hotel = { ...data.hotel };
  delete hotel.images;

  return {
    ...data,
    hotel: {
      ...hotel,
      image_urls: sorted.map((image) => image.object_key).filter(Boolean),
    },
  };
}

/**
 * Reviews authored by the authenticated user (published + hidden, so they can
 * see when a moderator hides something). `status` optionally narrows the list
 * (e.g. `published` for the "Reviewed" tab); per-status counts are always
 * returned so the dashboard counters stay correct.
 */
async function listUserReviews(userId, { page = 1, limit = 20, status } = {}) {
  const [result, counts] = await Promise.all([
    reviewRepository.findByUser(userId, { page, limit, status }),
    reviewRepository.countByStatusForUser(userId),
  ]);

  return {
    reviews: result.rows.map(serializeReview),
    page: parseInt(page, 10) || 1,
    limit: Math.min(parseInt(limit, 10) || 20, 100),
    total: result.count,
    published: counts.published,
    hidden: counts.hidden,
  };
}

module.exports = { listUserReviews };
