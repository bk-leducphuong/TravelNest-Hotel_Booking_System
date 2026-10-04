const logger = require('@config/logger.config');
const { paymentModule } = require('../../infrastructure/payment.client');

/**
 * Best-effort cancellation of the Stripe PaymentIntent attached to an expired
 * booking. Never throws: an expired booking must not be blocked by a provider
 * hiccup.
 */
async function cancelExpiredPaymentIntent(paymentIntentId, bookingId) {
  try {
    const payment = await paymentModule().paymentProvider.getPayment(paymentIntentId);
    const cancellableStatuses = ['pending', 'processing', 'requires_payment_method'];

    if (!cancellableStatuses.includes(payment.status) && payment.status !== 'requires_action') {
      logger.warn('Expired booking payment intent is not cancellable', {
        bookingId,
        paymentIntentId,
        status: payment.status,
      });
      return null;
    }

    return await paymentModule().paymentProvider.cancelPayment(paymentIntentId);
  } catch (error) {
    logger.warn('Failed to cancel expired booking payment intent', {
      bookingId,
      paymentIntentId,
      error: error.message,
    });
    return null;
  }
}

module.exports = { cancelExpiredPaymentIntent };
