const logger = require('@config/logger.config');
const bookingRepository = require('../../infrastructure/booking.repository');

const { expireBookingIfDue } = require('./expireBookingIfDue');

/**
 * Scan for pending bookings past their expiry and expire each one. A failure on
 * one booking is logged and skipped so the rest of the batch still runs.
 *
 * @param {{ limit?: number }} options
 * @returns {Promise<{ processed: number, released: number, expiredBookings: object[] }>}
 */
async function expirePendingBookings(options = {}) {
  const expired = await bookingRepository.findExpiredPending({
    limit: options.limit || 100,
    order: [['expires_at', 'ASC']],
  });

  let released = 0;
  const expiredBookings = [];

  for (const booking of expired) {
    try {
      const expiredBooking = await expireBookingIfDue(booking.id);

      if (expiredBooking) {
        expiredBookings.push(expiredBooking);
        released += 1;
      }
    } catch (error) {
      logger.error('Failed to expire pending booking', {
        bookingId: booking.id,
        error: error.message,
      });
    }
  }

  return { processed: expired.length, released, expiredBookings };
}

module.exports = { expirePendingBookings };
