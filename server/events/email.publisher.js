const logger = require('@config/logger.config');
const natsPublisher = require('@events/nats.publisher');

async function publishBookingConfirmation(context, options = {}) {
  return publish(
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
  return publish(
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
  return publish(
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

async function publish(type, data, baseID) {
  const result = await natsPublisher.publish(
    'notification.email.requested.v1',
    { type, data },
    {
      eventId: `${baseID}-email-${type}`,
      correlationId: baseID,
    }
  );
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
