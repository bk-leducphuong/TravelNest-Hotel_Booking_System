const ApiError = require('@utils/ApiError');
const logger = require('@config/logger.config');
const StripePaymentAdapter = require('../../infrastructure/adapters/stripe-payment.adapter');
const savedPaymentMethodRepository = require('../../infrastructure/saved-payment-method.repository');

const { getOrCreateStripeCustomer } = require('./getOrCreateStripeCustomer');
const { toPaymentMethodView } = require('./paymentMethodView');

const stripeAdapter = new StripePaymentAdapter();

/**
 * Mirror a card that the client just attached via a confirmed SetupIntent.
 *
 * The SetupIntent is verified against the user's own customer so a caller can
 * never attach a payment method that belongs to somebody else. The first card
 * a user saves becomes their default.
 *
 * @param {number|string} userId
 * @param {{ setupIntentId: string }} payload
 * @returns {Promise<object>} saved payment method view
 */
async function savePaymentMethod(userId, { setupIntentId } = {}) {
  if (!setupIntentId) {
    throw new ApiError(400, 'MISSING_REQUIRED_FIELDS', 'setupIntentId is required');
  }

  const customerId = await getOrCreateStripeCustomer(userId);
  const setupIntent = await stripeAdapter.getSetupIntent(setupIntentId);

  if (String(setupIntent.customerId || '') !== String(customerId)) {
    throw new ApiError(
      403,
      'PAYMENT_METHOD_FORBIDDEN',
      'This payment method does not belong to your account'
    );
  }

  if (!setupIntent.paymentMethodId) {
    throw new ApiError(
      400,
      'PAYMENT_METHOD_NOT_READY',
      'The card setup has not completed yet. Please try again.'
    );
  }

  const paymentMethod = await stripeAdapter.getPaymentMethod(setupIntent.paymentMethodId);

  if (paymentMethod.customerId && String(paymentMethod.customerId) !== String(customerId)) {
    throw new ApiError(
      403,
      'PAYMENT_METHOD_FORBIDDEN',
      'This payment method does not belong to your account'
    );
  }

  const existing = await savedPaymentMethodRepository.findByPaymentMethodId(paymentMethod.id);
  const card = paymentMethod.card || {};
  const cardholderName = paymentMethod.billingDetails?.name || null;
  const isFirstCard = (await savedPaymentMethodRepository.countByUserId(userId)) === 0;

  if (existing) {
    await savedPaymentMethodRepository.updateByPaymentMethodId(paymentMethod.id, {
      brand: card.brand,
      last4: card.last4,
      expMonth: card.expMonth,
      expYear: card.expYear,
      cardholderName,
    });
  } else {
    await savedPaymentMethodRepository.create({
      userId,
      customerId,
      paymentMethodId: paymentMethod.id,
      brand: card.brand,
      last4: card.last4,
      expMonth: card.expMonth,
      expYear: card.expYear,
      cardholderName,
      isDefault: isFirstCard,
    });

    if (isFirstCard) {
      // Best-effort: the card is already saved; a Stripe hiccup here must not
      // fail the save. The webhook reconciliation will catch up later.
      try {
        await stripeAdapter.updateCustomerDefaultPaymentMethod(customerId, paymentMethod.id);
      } catch (error) {
        logger.warn(
          { error: error.message, userId },
          'Failed to set Stripe default payment method for first card'
        );
      }
    }
  }

  const saved = await savedPaymentMethodRepository.findByPaymentMethodId(paymentMethod.id);
  return toPaymentMethodView(saved);
}

module.exports = { savePaymentMethod };
