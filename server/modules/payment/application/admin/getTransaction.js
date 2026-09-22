const ApiError = require('@utils/ApiError');

const transactionRepository = require('../../infrastructure/transaction.repository');

async function getTransaction(transactionId) {
  const transaction = await transactionRepository.findByIdWithRelations(transactionId);

  if (!transaction) {
    throw new ApiError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
  }

  return transaction;
}

module.exports = { getTransaction };
