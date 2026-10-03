const bookingRepository = require('./infrastructure/booking.repository');
const holdService = require('./application/hold.service');

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

// --- Persistence API used by the payment module (booking owns these tables) ---

async function getBookingsByCode(bookingCode, options = {}) {
  return await bookingRepository.findAllByBookingCode(bookingCode, options);
}

async function findBookingByCode(bookingCode, options = {}) {
  return await bookingRepository.findByBookingCode(bookingCode, options);
}

async function createBooking(bookingData, options = {}) {
  return await bookingRepository.create(bookingData, options);
}

async function updateBookingsByCode(bookingCode, updateData, options = {}) {
  return await bookingRepository.updateByBookingCode(bookingCode, updateData, options);
}

module.exports = {
  adminRoutes,
  getCompletedBookingForReview,

  // Persistence API for cross-module callers (payment).
  getBookingsByCode,
  findBookingByCode,
  createBooking,
  updateBookingsByCode,

  // Hold lifecycle (booking owns holds); used by the hold controller/worker and
  // payment's createPaymentIntent.
  hold: holdService,

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
