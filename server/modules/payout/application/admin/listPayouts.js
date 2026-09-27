const payoutRepository = require('../../infrastructure/payout.repository');

/**
 * Paginated payout list for the admin payouts view.
 */
async function listPayouts(filters = {}) {
  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 20, 1), 100);

  const result = await payoutRepository.findAll(filters, {
    limit,
    offset: (page - 1) * limit,
  });

  return { payouts: result.rows, page, limit, total: result.count };
}

module.exports = { listPayouts };
