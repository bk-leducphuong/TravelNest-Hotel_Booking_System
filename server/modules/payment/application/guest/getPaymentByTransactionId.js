const ApiError = require('@utils/ApiError');
const transactionRepository = require('@repositories/transaction.repository');

/**
 * Get the transaction (with its payment) by transaction id, scoped to its buyer.
 *
 * NOTE: this endpoint previously called a method that did not exist on the
 * legacy service, so it always returned a 500. Implemented here against the
 * transaction repository.
 */
async function getPaymentByTransactionId(transactionId, userId) {
  const transaction = await transactionRepository.findById(transactionId);

  if (!transaction) {
    throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'Payment not found');
  }

  if (transaction.buyer_id !== userId) {
    throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to view this payment');
  }

  return transaction;
}

module.exports = { getPaymentByTransactionId };
