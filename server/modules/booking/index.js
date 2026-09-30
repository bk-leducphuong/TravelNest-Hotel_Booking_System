const bookingRepository = require('@repositories/booking.repository');

const adminRoutes = require('./api/admin.routes');
const { registerBookingSubscribers } = require('./events/subscribers');
const { getUserBookings } = require('./application/guest/getUserBookings');
const { getBookingById } = require('./application/guest/getBookingById');
const { getBookingByCode } = require('./application/guest/getBookingByCode');
const { cancelBooking } = require('./application/guest/cancelBooking');
const { createBookingFromHold } = require('./application/guest/createBookingFromHold');
const {
  createPaymentIntentForBooking,
} = require('./application/guest/createPaymentIntentForBooking');
const { expirePendingBookings } = require('./application/expiry/expirePendingBookings');

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

  // Guest channel (migrated out of services/booking.service.js).
  getUserBookings,
  getBookingById,
  getBookingByCode,
  cancelBooking,
  createBookingFromHold,
  createPaymentIntentForBooking,

  // Background expiry (worker entrypoint).
  expirePendingBookings,
};
