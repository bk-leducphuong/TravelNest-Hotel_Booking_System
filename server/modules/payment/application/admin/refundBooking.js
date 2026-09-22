const ApiError = require('@utils/ApiError');

const transactionRepository = require('../../infrastructure/transaction.repository');
const { initiateRefund } = require('./initiateRefund');

/**
 * Refund the payment transaction attached to a booking (full remaining balance
 * by default). Used by the Booking module when force-cancelling with a refund.
 */
async function refundBooking(bookingId, { reason, amount, actorUserId, requestId } = {}) {
  const transaction = await transactionRepository.findByBookingId(bookingId);

  if (!transaction) {
    throw new ApiError(404, 'TRANSACTION_NOT_FOUND', 'No payment transaction for this booking');
  }

  return await initiateRefund(transaction.id, { reason, amount }, { actorUserId, requestId });
}

module.exports = { refundBooking };
