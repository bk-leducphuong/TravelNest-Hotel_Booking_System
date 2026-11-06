const logger = require('@config/logger.config');
const identityModule = require('@modules/identity');
const savedPaymentMethodRepository = require('../../infrastructure/saved-payment-method.repository');

/**
 * Handle `customer.updated`: keep the local default badge in sync with Stripe's
 * canonical `invoice_settings.default_payment_method`.
 */
async function handleCustomerUpdated(event) {
  const customer = event.data || {};
  const customerId = customer.id;

  if (!customerId) {
    return { updated: false };
  }

  const userId = await identityModule.users.findUserIdByStripeCustomerId(customerId);
  if (!userId) {
    logger.warn({ customerId }, 'Customer event for unknown Stripe customer');
    return { updated: false };
  }

  const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method || null;
  const methods = await savedPaymentMethodRepository.findByUserId(userId);

  for (const method of methods) {
    const shouldBeDefault = method.stripe_payment_method_id === defaultPaymentMethodId;
    if (method.is_default !== shouldBeDefault) {
      await savedPaymentMethodRepository.updateByPaymentMethodId(method.stripe_payment_method_id, {
        isDefault: shouldBeDefault,
      });
    }
  }

  logger.info('customer.updated handled', {
    eventId: event.id,
    customerId,
    defaultPaymentMethodId,
  });

  return { updated: true };
}

module.exports = { handleCustomerUpdated };
