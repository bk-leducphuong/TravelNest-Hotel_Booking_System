const ApiError = require('@utils/ApiError');

const payoutRepository = require('../../infrastructure/payout.repository');

async function getPayout(payoutId) {
  const payout = await payoutRepository.findByIdWithItems(payoutId);

  if (!payout) {
    throw new ApiError(404, 'PAYOUT_NOT_FOUND', 'Payout not found');
  }

  return payout;
}

module.exports = { getPayout };
