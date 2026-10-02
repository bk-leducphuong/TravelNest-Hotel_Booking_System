const bookingRepository = require('./infrastructure/booking.repository');
const holdRepository = require('./infrastructure/hold.repository');

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

async function getCancellationRule(hotelId, roomId) {
  return await bookingRepository.findCancellationRule(hotelId, roomId);
}

// --- Holds (booking-owned; used by payment + the hold expiry worker) ---

async function createHold(data, options = {}) {
  return await holdRepository.create(data, options);
}

async function getHoldByIdWithRooms(holdId, options = {}) {
  return await holdRepository.findByIdWithRooms(holdId, options);
}

async function getActiveHoldsByUser(userId, options = {}) {
  return await holdRepository.findActiveByUserId(userId, options);
}

async function updateHoldStatus(holdId, updateData, options = {}) {
  return await holdRepository.updateStatus(holdId, updateData, options);
}

async function getExpiredActiveHolds(options = {}) {
  return await holdRepository.findExpiredActive(options);
}

module.exports = {
  adminRoutes,
  getCompletedBookingForReview,

  // Persistence API for cross-module callers (payment).
  getBookingsByCode,
  findBookingByCode,
  createBooking,
  updateBookingsByCode,
  getCancellationRule,

  // Holds.
  createHold,
  getHoldByIdWithRooms,
  getActiveHoldsByUser,
  updateHoldStatus,
  getExpiredActiveHolds,

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
