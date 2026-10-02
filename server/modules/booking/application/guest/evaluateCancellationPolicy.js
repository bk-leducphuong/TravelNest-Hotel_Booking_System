const bookingRepository = require('../../infrastructure/booking.repository');

const { evaluateCancellationPolicy } = require('../../domain/cancellation-policy');

/**
 * Resolve the most specific cancellation rule for a booking and evaluate it.
 *
 * I/O (rule lookup) lives here; the money/date rules are pure and live in
 * domain/cancellation-policy.js.
 *
 * @param {object} booking - booking with `hotel`, `room_id`, `total_price`, dates
 * @returns {Promise<object>} cancellation policy
 */
async function evaluateBookingCancellationPolicy(booking) {
  const rule = await bookingRepository.findCancellationRule(booking.hotel_id, booking.room_id);

  return evaluateCancellationPolicy(rule, booking);
}

module.exports = { evaluateBookingCancellationPolicy };
