const { subscribe, DOMAIN_EVENTS } = require('@platform/events');
const logger = require('@config/logger.config');

let registered = false;

async function notifyRefundSucceeded(payload) {
  if (!payload?.buyerId && !payload?.bookingCode) {
    return;
  }

  try {
    const notificationPublisher = require('@platform/events/producers/notification');
    const delivered = await notificationPublisher.publishRefundCreated(
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
    if (!delivered) throw new Error('Refund notification delivery unavailable');
  } catch (error) {
    logger.warn(
      { error: error.message, refundId: payload.refundId },
      'Failed to publish refund notification'
    );
    throw error;
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

  subscribe(DOMAIN_EVENTS.PAYMENT_REFUND_SUCCEEDED, notifyRefundSucceeded);
  subscribe(DOMAIN_EVENTS.PAYMENT_REFUND_FAILED, async (payload) => {
    logger.error(
      { refundId: payload.refundId, hotelId: payload.hotelId, needsAttention: true },
      'refund_attention_required'
    );
    return true;
  });

  logger.info('Payment module event subscribers registered');
}

module.exports = { registerPaymentSubscribers };
