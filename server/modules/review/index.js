const guestRoutes = require('./api/guest.routes');
const adminRoutes = require('./api/admin.routes');
const { recomputeHotelRatingSummary } = require('./application/recomputeHotelRatingSummary');
const ratingSummaryRepository = require('./infrastructure/rating-summary.repository');
const { registerReviewSubscribers } = require('./events/subscribers');

// Register once per process (guarded).
registerReviewSubscribers();

/**
 * Review module - public interface.
 *
 * Other modules may only use what is exported here. They must not import the
 * module's repositories or models directly.
 */

/**
 * Read the rating projection for a hotel (used by Catalog/search/dashboards).
 */
async function getHotelRatingSummary(hotelId) {
  const summary = await ratingSummaryRepository.findByHotelId(hotelId);
  if (!summary) {
    return null;
  }
  return summary.toJSON ? summary.toJSON() : summary;
}

module.exports = {
  guestRoutes,
  adminRoutes,
  getHotelRatingSummary,
  recomputeHotelRatingSummary,
};
