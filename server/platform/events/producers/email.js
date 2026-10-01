const logger = require('@config/logger.config');
const { publish, INTEGRATION_EVENTS } = require('@platform/events');

/**
 * Email (and email test-broadcast) integration event producers.
 *
 * Emit through the EventPublisher port so the transport stays an adapter
 * detail.
 */

async function publishBookingConfirmation(context, options = {}) {
  return emit(
    'booking_confirmation',
    {
      email: context.receiptEmail,
      bookingCode: context.bookingCode,
      checkInDate: context.checkInDate,
      checkOutDate: context.checkOutDate,
      numberOfGuests: context.numberOfGuests,
      totalPrice: context.amount,
      currency: context.currency,
      buyerName: context.buyerName || 'Guest',
      hotelName: context.hotelName || 'Our Hotel',
      roomType: context.roomType || 'Standard Room',
    },
    options.sourceEventId || context.eventId || context.bookingCode
  );
}

async function publishPaymentFailure(context, options = {}) {
  return emit(
    'payment_failure',
    {
      email: context.receiptEmail,
      bookingCode: context.bookingCode,
      failureMessage: context.failureMessage,
      buyerName: context.buyerName || 'Guest',
    },
    options.sourceEventId || context.eventId || context.paymentIntentId
  );
}

async function publishTestBroadcast(context, options = {}) {
  return emit(
    'test_broadcast',
    {
      email: context.email,
      subject: context.subject,
      message: context.message,
      recipientName: context.recipientName || 'Traveler',
      metadata: context.metadata || {},
      triggeredByAdminId: context.triggeredByAdminId || null,
    },
    options.sourceEventId || context.eventId || context.email
  );
}

async function emit(type, data, baseID) {
  const outcome = await publish(
    INTEGRATION_EVENTS.EMAIL_REQUESTED,
    { type, data },
    {
      eventId: `${baseID}-email-${type}`,
      correlationId: baseID,
    }
  );

  const result = outcome.responses[0]?.result ?? null;
  if (!result) {
    logger.warn({ type, data }, 'Failed to publish email request event');
  }
  return result;
}

module.exports = {
  publishBookingConfirmation,
  publishPaymentFailure,
  publishTestBroadcast,
};
