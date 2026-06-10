const logger = require('@config/logger.config');
const natsPublisher = require('@events/nats.publisher');

async function publishPaymentSucceeded(context, options = {}) {
  return publish(
    'payment.payment.succeeded.v1',
    {
      buyerId: context.buyerId,
      hotelId: context.hotelId,
      bookingCode: context.bookingCode,
      bookingId: context.bookingId,
      checkInDate: context.checkInDate,
      checkOutDate: context.checkOutDate,
      numberOfGuests: context.numberOfGuests,
      bookedRooms: context.bookedRooms,
      amount: context.amount,
      currency: context.currency,
    },
    {
      eventId: `${options.sourceEventId || context.eventId || context.bookingCode}-payment-succeeded`,
      correlationId: options.sourceEventId || context.eventId || context.bookingCode,
    }
  );
}

async function publishRefundCreated(context, options = {}) {
  return publish(
    'payment.refund.created.v1',
    {
      buyerId: context.buyerId,
      hotelId: context.hotelId,
      bookingCode: context.bookingCode,
      refundAmount: context.refundAmount,
      currency: context.currency,
    },
    {
      eventId: `${options.sourceEventId || context.eventId || context.chargeId}-refund-created`,
      correlationId: options.sourceEventId || context.eventId || context.chargeId,
    }
  );
}

async function publishPayoutCompleted(context, options = {}) {
  return publishPayout('payment.payout.completed.v1', 'completed', context, options);
}

async function publishPayoutFailed(context, options = {}) {
  return publishPayout('payment.payout.failed.v1', 'failed', context, options);
}

async function publishBookingExpired(booking, options = {}) {
  return publish(
    'booking.booking.expired.v1',
    {
      buyerId: booking.buyerId,
      hotelId: booking.hotelId,
      bookingId: booking.bookingId,
      bookingCode: booking.bookingCode,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      paymentDueAt: booking.paymentDueAt,
    },
    {
      eventId: `${options.sourceEventId || booking.bookingId || booking.bookingCode}-booking-expired`,
      correlationId: options.sourceEventId || booking.bookingId || booking.bookingCode,
      occurredAt: options.occurredAt || booking.expiredAt || new Date(),
    }
  );
}

async function publishTestInAppRequested(context, options = {}) {
  return publish(
    'notification.test.inapp.requested.v1',
    {
      receiverIds: context.receiverIds,
      title: context.title,
      message: context.message,
      category: context.category || 'system',
      priority: context.priority || 'medium',
      actionUrl: context.actionUrl || null,
      actionLabel: context.actionLabel || null,
      metadata: context.metadata || {},
      senderId: context.senderId || null,
      triggeredByAdminId: context.triggeredByAdminId || null,
    },
    {
      eventId: options.sourceEventId || context.eventId,
      correlationId: options.correlationId || options.sourceEventId || context.eventId,
    }
  );
}

async function publishPayout(subject, status, context, options = {}) {
  return publish(
    subject,
    {
      hotelId: context.hotelId,
      transactionId: context.transactionId,
      payoutId: context.payoutId,
      amount: context.amount,
      currency: context.currency,
      status,
    },
    {
      eventId: `${options.sourceEventId || context.eventId || context.payoutId || context.transactionId}-${status}-payout`,
      correlationId:
        options.sourceEventId || context.eventId || context.payoutId || context.transactionId,
    }
  );
}

async function publish(subject, payload, options = {}) {
  const result = await natsPublisher.publish(subject, payload, options);
  if (!result) {
    logger.warn({ subject, payload }, 'Failed to publish notification event');
  }
  return result;
}

module.exports = {
  publishPaymentSucceeded,
  publishRefundCreated,
  publishPayoutCompleted,
  publishPayoutFailed,
  publishBookingExpired,
  publishTestInAppRequested,
};
