const logger = require('@config/logger.config');
const { upsertFromStripePaymentMethod } = require('./paymentMethodSync');

/**
 * Handle `payment_method.attached`: mirror the newly attached card.
 */
async function handlePaymentMethodAttached(event) {
  const id = await upsertFromStripePaymentMethod(event.data);

  logger.info('payment_method.attached handled', {
    eventId: event.id,
    paymentMethod: event.data?.id,
  });

  return { paymentMethodRecordId: id };
}

module.exports = { handlePaymentMethodAttached };
