const logger = require('@config/logger.config');
const { upsertFromStripePaymentMethod } = require('./paymentMethodSync');

/**
 * Handle `payment_method.updated`: refresh the mirrored card details.
 */
async function handlePaymentMethodUpdated(event) {
  const id = await upsertFromStripePaymentMethod(event.data);

  logger.info('payment_method.updated handled', {
    eventId: event.id,
    paymentMethod: event.data?.id,
  });

  return { paymentMethodRecordId: id };
}

module.exports = { handlePaymentMethodUpdated };
