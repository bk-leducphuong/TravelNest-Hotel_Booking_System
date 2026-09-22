const { eventBus, DOMAIN_EVENTS } = require('@platform/events');
const logger = require('@config/logger.config');

let registered = false;

async function notifyRefundSucceeded(payload) {
  if (!payload?.buyerId && !payload?.bookingCode) {
    return;
  }

  try {
    const notificationPublisher = require('@events/notification.publisher');
    await notificationPublisher.publishRefundCreated(
      {
        buyerId: payload.buyerId,
        hotelId: payload.hotelId,
        bookingCode: payload.bookingCode,
        refundAmount: payload.amount,
        currency: payload.currency,
        chargeId: payload.transactionId,
      },
      { sourceEventId: `admin-refund-${payload.refundId}` }
    );
  } catch (error) {
    logger.warn(
      { error: error.message, refundId: payload.refundId },
      'Failed to publish refund notification'
    );
  }
}

/**
 * Wire payment-domain subscribers. Safe to call more than once.
 */
function registerPaymentSubscribers() {
  if (registered) {
    return;
  }
  registered = true;

  eventBus.subscribe(DOMAIN_EVENTS.PAYMENT_REFUND_SUCCEEDED, notifyRefundSucceeded);

  logger.info('Payment module event subscribers registered');
}

module.exports = { registerPaymentSubscribers };
