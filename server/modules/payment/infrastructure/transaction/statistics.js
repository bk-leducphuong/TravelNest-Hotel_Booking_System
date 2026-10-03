const { Transactions } = require('@models/index.js');
const logger = require('@config/logger.config');

/**
 * Transaction statistics.
 */

async function summarize(where) {
  const transactions = await Transactions.findAll({
    where,
    attributes: ['status', 'amount', 'currency'],
  });

  const stats = {
    total: transactions.length,
    completed: 0,
    pending: 0,
    failed: 0,
    totalAmount: 0,
    currency: 'USD',
  };

  transactions.forEach((tx) => {
    if (tx.status === 'completed') stats.completed++;
    else if (tx.status === 'pending' || tx.status === 'processing') stats.pending++;
    else if (tx.status === 'failed') stats.failed++;

    if (tx.status === 'completed') {
      stats.totalAmount += parseFloat(tx.amount || 0);
      stats.currency = tx.currency || 'USD';
    }
  });

  return stats;
}

async function getBuyerStatistics(buyerId) {
  try {
    return await summarize({ buyer_id: buyerId });
  } catch (error) {
    logger.error('Error getting buyer statistics:', error);
    throw error;
  }
}

async function getHotelStatistics(hotelId) {
  try {
    return await summarize({ hotel_id: hotelId });
  } catch (error) {
    logger.error('Error getting hotel statistics:', error);
    throw error;
  }
}

module.exports = { getBuyerStatistics, getHotelStatistics };
