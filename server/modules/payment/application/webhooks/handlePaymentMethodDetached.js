const logger = require('@config/logger.config');
const { deleteByStripePaymentMethodId } = require('./paymentMethodSync');

/**
 * Handle `payment_method.detached`: drop the mirrored row.
 */
async function handlePaymentMethodDetached(event) {
  const paymentMethodId = event.data?.id;

  if (paymentMethodId) {
    await deleteByStripePaymentMethodId(paymentMethodId);
  }

  logger.info('payment_method.detached handled', {
    eventId: event.id,
    paymentMethod: paymentMethodId,
  });

  return { paymentMethodId };
}

module.exports = { handlePaymentMethodDetached };
