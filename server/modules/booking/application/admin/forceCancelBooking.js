const ApiError = require('@utils/ApiError');
const bookings = require('../../infrastructure/booking-admin.repository');
const { cancelBooking } = require('../guest/cancelBooking');

async function forceCancelBooking(
  bookingId,
  { reason, processRefund = true, refundAmount, actorUserId, requestId } = {}
) {
  const booking = await bookings.findById(bookingId);
  if (!booking) throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  const result = await cancelBooking(bookingId, booking.buyer_id, {
    admin: true,
    actorUserId,
    requestId,
    reason,
    refundAmount: processRefund === false ? 0 : refundAmount,
  });
  return {
    ...result,
    previousStatus: booking.status,
    inventoryReleased: !result.idempotentReplay,
    refundError: null,
  };
}

module.exports = { forceCancelBooking };
