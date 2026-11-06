const ApiError = require('@utils/ApiError');
const logger = require('@config/logger.config');
const StripePaymentAdapter = require('../../infrastructure/adapters/stripe-payment.adapter');
const savedPaymentMethodRepository = require('../../infrastructure/saved-payment-method.repository');

const stripeAdapter = new StripePaymentAdapter();

/**
 * Remove a saved card: detach it at Stripe, drop the local row, and promote a
 * replacement default when the removed card was the default.
 *
 * @param {number|string} userId
 * @param {string} paymentMethodId
 * @returns {Promise<{ id: string, removed: boolean, defaultPaymentMethodId: string|null }>}
 */
async function removePaymentMethod(userId, paymentMethodId) {
  const record = await savedPaymentMethodRepository.findByPaymentMethodId(paymentMethodId);

  if (!record || String(record.user_id) !== String(userId)) {
    throw new ApiError(404, 'PAYMENT_METHOD_NOT_FOUND', 'Payment method not found');
  }

  await stripeAdapter.detachPaymentMethod(paymentMethodId);
  await savedPaymentMethodRepository.deleteByPaymentMethodId(paymentMethodId);

  let defaultPaymentMethodId = null;

  if (record.is_default) {
    const remaining = await savedPaymentMethodRepository.findByUserId(userId);
    const next = remaining[0] || null;

    if (next) {
      try {
        await stripeAdapter.updateCustomerDefaultPaymentMethod(
          next.stripe_customer_id,
          next.stripe_payment_method_id
        );
        await savedPaymentMethodRepository.setDefaultById(next.id);
        defaultPaymentMethodId = next.stripe_payment_method_id;
      } catch (error) {
        logger.warn(
          { error: error.message, userId },
          'Failed to promote replacement default payment method'
        );
      }
    } else {
      try {
        await stripeAdapter.updateCustomerDefaultPaymentMethod(record.stripe_customer_id, null);
      } catch (error) {
        logger.warn(
          { error: error.message, userId },
          'Failed to clear default payment method on Stripe customer'
        );
      }
    }
  }

  return { id: paymentMethodId, removed: true, defaultPaymentMethodId };
}

module.exports = { removePaymentMethod };
