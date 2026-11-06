const ApiError = require('@utils/ApiError');
const sequelize = require('@config/database.config');
const StripePaymentAdapter = require('../../infrastructure/adapters/stripe-payment.adapter');
const savedPaymentMethodRepository = require('../../infrastructure/saved-payment-method.repository');

const { toPaymentMethodView } = require('./paymentMethodView');

const stripeAdapter = new StripePaymentAdapter();

/**
 * Mark one of the user's cards as their default.
 *
 * Stripe's `invoice_settings.default_payment_method` is canonical; the local
 * `is_default` flag is updated in the same call so listing stays fast.
 *
 * @param {number|string} userId
 * @param {string} paymentMethodId
 * @returns {Promise<object>} updated payment method view
 */
async function setDefaultPaymentMethod(userId, paymentMethodId) {
  const record = await savedPaymentMethodRepository.findByPaymentMethodId(paymentMethodId);

  if (!record || String(record.user_id) !== String(userId)) {
    throw new ApiError(404, 'PAYMENT_METHOD_NOT_FOUND', 'Payment method not found');
  }

  await stripeAdapter.updateCustomerDefaultPaymentMethod(
    record.stripe_customer_id,
    paymentMethodId
  );

  await sequelize.transaction(async (transaction) => {
    await savedPaymentMethodRepository.clearDefaultForUser(userId, { transaction });
    await savedPaymentMethodRepository.setDefaultById(record.id, { transaction });
  });

  const updated = await savedPaymentMethodRepository.findByPaymentMethodId(paymentMethodId);
  return toPaymentMethodView(updated);
}

module.exports = { setDefaultPaymentMethod };
