const bookingRepository = require('@repositories/booking.repository');

const adminRoutes = require('./api/admin.routes');
const { registerBookingSubscribers } = require('./events/subscribers');

// Register once per process (guarded).
registerBookingSubscribers();

/**
 * Booking module - public interface.
 *
 * Other modules may only use the use-cases exported here. They must never
 * import Booking's models or repositories directly. This keeps the boundary
 * intact now and makes extracting Booking into its own service mechanical.
 */

/**
 * Resolve a completed booking that a user wants to review.
 * @returns {Promise<object|null>}
 */
async function getCompletedBookingForReview({ bookingCode, buyerId, hotelId }) {
  return await bookingRepository.findCompletedByCodeAndBuyer({
    bookingCode,
    buyerId,
    hotelId,
  });
}

module.exports = {
  adminRoutes,
  getCompletedBookingForReview,
};
