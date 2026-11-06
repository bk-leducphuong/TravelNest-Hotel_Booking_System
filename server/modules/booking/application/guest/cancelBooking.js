const ApiError = require('@utils/ApiError');
const sequelize = require('@config/database.config');
const inventory = require('@modules/inventory');
const bookings = require('../../infrastructure/booking.repository');
const { paymentModule } = require('../../infrastructure/payment.client');
const { assertTransition, requiresInventoryRelease } = require('../../domain/booking-status');
const { cancellationContext, calculateQuote } = require('./cancellationQuote');

/** Booking lock serializes guest/admin cancellation with payment confirmation and expiry. */
async function cancelBooking(
  bookingId,
  userId,
  { quoteId, admin = false, reason, refundAmount, actorUserId = userId, requestId } = {}
) {
  return sequelize.transaction(async (transaction) => {
    const booking = await cancellationContext(bookingId, userId, transaction);
    if (booking.status === 'cancelled') {
      if (!booking.cancellation_decision)
        throw new ApiError(409, 'BOOKING_ALREADY_CANCELLED', 'Booking is already cancelled');
      const decision = booking.cancellation_decision;
      const refund = decision.refundId
        ? await paymentModule().getCancellationRefund(decision.refundId, { transaction })
        : null;
      return {
        bookingId,
        bookingCode: booking.booking_code,
        status: 'cancelled',
        refundProcessed: false,
        refund,
        cancellationPolicy: decision.quote,
        decision,
        idempotentReplay: true,
      };
    }
    assertTransition(booking.status, 'cancelled');
    const { quote, policy, payment, remaining } = await calculateQuote(booking, transaction);
    const issued = booking.cancellation_quote;
    if (
      !admin &&
      (!quoteId ||
        issued?.quoteId !== quoteId ||
        !Number.isFinite(Date.parse(issued.expiresAt)) ||
        Date.parse(issued.expiresAt) <= Date.now() ||
        ['refundAmount', 'currency', 'eligibility', 'reason', 'amountPaid'].some(
          (key) => issued[key] !== quote[key]
        ))
    ) {
      throw new ApiError(
        409,
        'CANCELLATION_QUOTE_EXPIRED',
        'Please review a fresh cancellation quote'
      );
    }
    if (admin) {
      refundAmount = refundAmount === undefined || refundAmount === null ? remaining : refundAmount;
      quote.refundAmount = refundAmount;
      quote.eligibility = refundAmount > 0 ? 'eligible' : 'ineligible';
      quote.reason = 'admin_override';
      quote.cancellationFee = Math.max(0, quote.amountPaid - refundAmount);
    }
    if (
      admin &&
      quote.refundAmount > 0 &&
      (!payment?.stripe_charge_id || payment.currency.toUpperCase() !== 'USD')
    ) {
      quote.refundAmount = 0;
      quote.eligibility = 'manual_review';
      quote.reason = 'provider_data_requires_review';
    }
    const refund =
      quote.refundAmount > 0
        ? await paymentModule().createCancellationRefund(
            payment,
            {
              amount: quote.refundAmount,
              reason: admin ? 'hotel_cancelled' : policy.reason,
              key: `booking-cancellation-${bookingId}`,
              source: admin ? 'admin_cancellation' : 'guest_cancellation',
              actorUserId,
              quote,
            },
            { transaction }
          )
        : quote.eligibility === 'manual_review'
          ? await paymentModule().recordCancellationReview(payment, quote, { transaction })
          : null;
    const decision = {
      quoteId: issued?.quoteId || null,
      quote,
      refundId: refund?.refundId || null,
      approvedRefundAmount: quote.eligibility === 'manual_review' ? 0 : refund?.amount || 0,
      outcome:
        quote.eligibility === 'manual_review'
          ? 'manual_review'
          : refund
            ? 'refund_required'
            : 'no_refund',
      actorUserId,
      reason: reason || quote.reason,
      decidedAt: new Date().toISOString(),
      requestId: requestId || null,
    };
    const [updated] = await bookings.update(
      bookingId,
      { status: 'cancelled', cancelled_at: new Date(), cancellation_decision: decision },
      { transaction, where: { id: bookingId, status: booking.status } }
    );
    if (updated !== 1) throw new ApiError(409, 'BOOKING_STATUS_CHANGED', 'Booking status changed');
    if (requiresInventoryRelease(booking.status)) {
      const rooms = booking.bookingRooms?.length
        ? booking.bookingRooms.map((room) => ({
            room_id: room.room_id,
            roomQuantity: room.quantity,
          }))
        : booking.room_id
          ? [{ room_id: booking.room_id, roomQuantity: booking.quantity || 1 }]
          : [];
      if (rooms.length)
        await inventory.releaseRooms(
          {
            bookedRooms: rooms,
            checkInDate: booking.check_in_date,
            checkOutDate: booking.check_out_date,
          },
          { transaction }
        );
    }
    await paymentModule().recordCancellationEvent(
      { bookingId, hotelId: booking.hotel_id, buyerId: userId, decision },
      { transaction }
    );
    return {
      bookingId,
      bookingCode: booking.booking_code,
      status: 'cancelled',
      refundProcessed: false,
      refund,
      cancellationPolicy: quote,
      decision,
      message: 'Booking cancelled; any eligible refund is queued',
    };
  });
}

module.exports = { cancelBooking };
