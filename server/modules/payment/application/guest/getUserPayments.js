const paymentRepository = require('../../infrastructure/payment.repository');

/**
 * Get a paginated list of a user's payments.
 */
async function getUserPayments(userId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const validatedLimit = Math.min(limit, 100);
  const offset = (page - 1) * validatedLimit;

  const result = await paymentRepository.findPaymentsByBuyerId(userId, {
    limit: validatedLimit,
    offset,
  });

  return {
    payments: result.rows,
    page,
    limit: validatedLimit,
    total: result.count,
  };
}

module.exports = { getUserPayments };
