const transactionRepository = require('../../infrastructure/transaction.repository');

/**
 * Paginated transaction list for the admin payments view.
 */
async function listTransactions(filters = {}) {
  const result = await transactionRepository.findForHotel(filters);

  return {
    transactions: result.rows,
    page: Math.max(parseInt(filters.page, 10) || 1, 1),
    limit: Math.min(Math.max(parseInt(filters.limit, 10) || 20, 1), 100),
    total: result.count,
  };
}

module.exports = { listTransactions };
