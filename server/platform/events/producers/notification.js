const logger = require('@config/logger.config');
const { publish, INTEGRATION_EVENTS } = require('@platform/events');

/**
 * Notification integration event producers.
 *
 * Build the domain payloads the notification service (Go) consumes and emit
 * them through the EventPublisher port - never through a transport directly.
 */

async function publishPaymentSucceeded(context, options = {}) {
  return emit(
    INTEGRATION_EVENTS.PAYMENT_SUCCEEDED,
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
  return emit(
    INTEGRATION_EVENTS.REFUND_CREATED,
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
  return publishPayout(INTEGRATION_EVENTS.PAYOUT_COMPLETED, 'completed', context, options);
}

async function publishPayoutFailed(context, options = {}) {
  return publishPayout(INTEGRATION_EVENTS.PAYOUT_FAILED, 'failed', context, options);
}

async function publishBookingExpired(booking, options = {}) {
  return emit(
    INTEGRATION_EVENTS.BOOKING_EXPIRED,
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
  return emit(
    INTEGRATION_EVENTS.IN_APP_REQUESTED,
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

async function publishPayout(topic, status, context, options = {}) {
  return emit(
    topic,
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

async function emit(topic, payload, meta = {}) {
  const outcome = await publish(topic, payload, meta);
  const result = outcome.responses[0]?.result ?? null;
  if (!result) {
    logger.warn({ topic, payload }, 'Failed to publish notification event');
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
