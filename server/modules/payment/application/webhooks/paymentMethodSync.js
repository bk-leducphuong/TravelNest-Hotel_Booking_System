const logger = require('@config/logger.config');
const identityModule = require('@modules/identity');
const savedPaymentMethodRepository = require('../../infrastructure/saved-payment-method.repository');

function cardFieldsFromStripePaymentMethod(stripePaymentMethod) {
  return {
    brand: stripePaymentMethod.card?.brand || null,
    last4: stripePaymentMethod.card?.last4 || null,
    expMonth: stripePaymentMethod.card?.exp_month ?? null,
    expYear: stripePaymentMethod.card?.exp_year ?? null,
    cardholderName: stripePaymentMethod.billing_details?.name || null,
  };
}

/**
 * Reconcile a Stripe PaymentMethod into the local mirror (attach / update).
 *
 * Used by webhooks so out-of-band changes (Stripe dashboard, expiry updates)
 * keep the mirror honest.
 *
 * @param {object} stripePaymentMethod - Stripe PaymentMethod object
 * @returns {Promise<string|null>} local row id
 */
async function upsertFromStripePaymentMethod(stripePaymentMethod) {
  const customerId = stripePaymentMethod?.customer;
  if (!customerId) {
    return null;
  }

  const userId = await identityModule.users.findUserIdByStripeCustomerId(customerId);
  if (!userId) {
    logger.warn({ customerId }, 'Payment method event for unknown Stripe customer');
    return null;
  }

  const existing = await savedPaymentMethodRepository.findByPaymentMethodId(stripePaymentMethod.id);
  const fields = cardFieldsFromStripePaymentMethod(stripePaymentMethod);

  if (existing) {
    await savedPaymentMethodRepository.updateByPaymentMethodId(stripePaymentMethod.id, fields);
    return existing.id;
  }

  const isFirstCard = (await savedPaymentMethodRepository.countByUserId(userId)) === 0;
  const created = await savedPaymentMethodRepository.create({
    userId,
    customerId,
    paymentMethodId: stripePaymentMethod.id,
    ...fields,
    isDefault: isFirstCard,
  });

  return created.id;
}

async function deleteByStripePaymentMethodId(stripePaymentMethodId) {
  return await savedPaymentMethodRepository.deleteByPaymentMethodId(stripePaymentMethodId);
}

module.exports = { upsertFromStripePaymentMethod, deleteByStripePaymentMethodId };
