const savedPaymentMethodRepository = require('../../infrastructure/saved-payment-method.repository');

/**
 * Resolve the Stripe customer / off-session flags for a saved card used at
 * checkout. Returns null for a card that is not saved for this user so the
 * caller falls back to a one-off (unattached) payment method.
 *
 * @param {number|string} userId
 * @param {string} paymentMethodId
 * @returns {Promise<{ customerId: string }|null>}
 */
async function getSavedPaymentMethodForCheckout(userId, paymentMethodId) {
  if (!paymentMethodId) {
    return null;
  }

  const record = await savedPaymentMethodRepository.findByPaymentMethodId(paymentMethodId);

  if (!record || String(record.user_id) !== String(userId)) {
    return null;
  }

  return { customerId: record.stripe_customer_id };
}

module.exports = { getSavedPaymentMethodForCheckout };
