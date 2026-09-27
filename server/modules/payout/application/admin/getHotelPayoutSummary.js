const payoutRepository = require('../../infrastructure/payout.repository');
const { isAccountPayoutReady } = require('../../domain/payout-rules');

/**
 * Payout summary for a hotel: totals by status plus connected-account readiness.
 */
async function getHotelPayoutSummary(hotelId) {
  const rows = await payoutRepository.sumByStatus(hotelId);

  const byStatus = {};
  let totalAmount = 0;
  let paidAmount = 0;
  let pendingAmount = 0;

  for (const row of rows) {
    const amount = parseFloat(row.total) || 0;
    const count = parseInt(row.count, 10) || 0;
    byStatus[row.status] = { count, amount: Math.round(amount * 100) / 100 };
    totalAmount += amount;
    if (row.status === 'paid') {
      paidAmount += amount;
    }
    if (row.status === 'pending' || row.status === 'processing') {
      pendingAmount += amount;
    }
  }

  const account = await payoutRepository.findReadyConnectedAccount({ hotelId });

  const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

  return {
    hotelId,
    byStatus,
    totalAmount: round(totalAmount),
    paidAmount: round(paidAmount),
    pendingAmount: round(pendingAmount),
    payoutReady: isAccountPayoutReady(account),
  };
}

module.exports = { getHotelPayoutSummary };
