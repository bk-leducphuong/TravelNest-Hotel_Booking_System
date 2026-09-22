const refundRepository = require('../../infrastructure/refund.repository');

/**
 * Paginated refund list for the admin payments view.
 */
async function listRefunds(filters = {}) {
  const result = await refundRepository.findForHotel(filters);

  return {
    refunds: result.rows,
    page: Math.max(parseInt(filters.page, 10) || 1, 1),
    limit: Math.min(Math.max(parseInt(filters.limit, 10) || 20, 1), 100),
    total: result.count,
  };
}

module.exports = { listRefunds };
