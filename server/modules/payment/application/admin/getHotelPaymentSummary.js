const transactionRepository = require('../../infrastructure/transaction.repository');
const refundRepository = require('../../infrastructure/refund.repository');
const { num, round2 } = require('../../domain/refund-rules');

const REVENUE_STATUSES = ['completed', 'partially_refunded', 'refunded'];

/**
 * Payment summary for a hotel: gross collected, refunded and net.
 */
async function getHotelPaymentSummary(hotelId) {
  const rows = await transactionRepository.getHotelSummary(hotelId);

  const byStatus = {};
  let grossAmount = 0;

  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
    if (REVENUE_STATUSES.includes(row.status)) {
      grossAmount += num(row.amount);
    }
  }

  const refundedAmount = await refundRepository.sumSucceededForHotel(hotelId);

  return {
    hotelId,
    totalTransactions: rows.length,
    byStatus,
    grossAmount: round2(grossAmount),
    refundedAmount: round2(refundedAmount),
    netAmount: round2(grossAmount - refundedAmount),
  };
}

module.exports = { getHotelPaymentSummary };
