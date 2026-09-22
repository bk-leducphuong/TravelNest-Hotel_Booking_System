const ApiError = require('@utils/ApiError');
const { eventBus, DOMAIN_EVENTS } = require('@platform/events');
const { auditService } = require('@platform/audit');

const bookingRepository = require('../../infrastructure/booking-admin.repository');
const { BOOKING_STATUS, assertTransition } = require('../../domain/booking-status');

/**
 * Generic admin status transition (confirm / check-in / complete / no-show).
 * Cancellation has its own use-case because it also releases inventory.
 */
async function updateBookingStatus(bookingId, { status, actorUserId, requestId } = {}) {
  if (status === BOOKING_STATUS.CANCELLED) {
    throw new ApiError(
      400,
      'USE_CANCEL_ENDPOINT',
      'Use the booking cancel endpoint to cancel a booking'
    );
  }

  const booking = await bookingRepository.findById(bookingId);

  if (!booking) {
    throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  }

  const previousStatus = booking.status;
  assertTransition(previousStatus, status);

  const values = { status };
  if (status === BOOKING_STATUS.CONFIRMED) {
    values.confirmed_at = new Date();
  }

  await bookingRepository.update(bookingId, values);

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'booking.status_changed',
    entityType: 'booking',
    entityId: bookingId,
    hotelId: booking.hotel_id,
    before: { status: previousStatus },
    after: { status },
    requestId,
  });

  await eventBus.publish(DOMAIN_EVENTS.BOOKING_STATUS_CHANGED, {
    bookingId,
    hotelId: booking.hotel_id,
    from: previousStatus,
    to: status,
  });

  if (status === BOOKING_STATUS.COMPLETED) {
    await eventBus.publish(DOMAIN_EVENTS.BOOKING_COMPLETED, {
      bookingId,
      hotelId: booking.hotel_id,
    });
  }

  return { bookingId, previousStatus, status };
}

module.exports = { updateBookingStatus };
