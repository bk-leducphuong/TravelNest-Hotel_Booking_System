const savedPaymentMethodRepository = require('../../infrastructure/saved-payment-method.repository');
const { toPaymentMethodView } = require('./paymentMethodView');

/**
 * List the cards a user has saved locally.
 *
 * @param {number|string} userId
 * @returns {Promise<Array<object>>}
 */
async function listPaymentMethods(userId) {
  const records = await savedPaymentMethodRepository.findByUserId(userId);
  return records.map(toPaymentMethodView);
}

module.exports = { listPaymentMethods };
