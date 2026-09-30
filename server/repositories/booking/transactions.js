const { Transactions } = require('@models/index.js');

/**
 * Transaction lookups/mutations scoped to a booking.
 */

async function findTransactionByBookingId(bookingId) {
  return await Transactions.findOne({
    where: { booking_id: bookingId },
    attributes: [
      'id',
      'amount',
      'currency',
      'status',
      'stripe_charge_id',
      'stripe_payment_intent_id',
    ],
  });
}

async function updateTransactionRefundState(transactionId, updateData, options = {}) {
  const mappedData = {};
  if (updateData.status !== undefined) mappedData.status = updateData.status;
  if (updateData.refundId !== undefined) mappedData.stripe_refund_id = updateData.refundId;
  if (updateData.completedAt !== undefined) mappedData.completed_at = updateData.completedAt;

  return await Transactions.update(mappedData, {
    where: { id: transactionId },
    ...options,
  });
}

module.exports = { findTransactionByBookingId, updateTransactionRefundState };
