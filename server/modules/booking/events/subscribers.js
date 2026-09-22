const { eventBus, DOMAIN_EVENTS } = require('@platform/events');
const logger = require('@config/logger.config');

let registered = false;

async function refreshHotelSnapshot({ hotelId, bookingId }) {
  if (!hotelId) {
    return;
  }

  try {
    const { emitBookingCompleted } = require('@utils/hotel_snapshot_events.utils');
    await emitBookingCompleted(hotelId, bookingId || null);
  } catch (error) {
    logger.warn(
      { error: error.message, hotelId, bookingId },
      'Failed to refresh hotel snapshot after booking completion'
    );
  }
}

/**
 * Wire booking-domain subscribers. Safe to call more than once.
 */
function registerBookingSubscribers() {
  if (registered) {
    return;
  }
  registered = true;

  eventBus.subscribe(DOMAIN_EVENTS.BOOKING_COMPLETED, refreshHotelSnapshot);

  logger.info('Booking module event subscribers registered');
}

module.exports = { registerBookingSubscribers };
