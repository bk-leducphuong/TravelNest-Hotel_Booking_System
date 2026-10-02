const ApiError = require('@utils/ApiError');
const paymentRepository = require('../../infrastructure/payment.repository');

/**
 * Get payment information for a booking, scoped to its buyer.
 */
async function getPaymentByBookingId(bookingId, userId) {
  const payment = await paymentRepository.findPaymentByBookingId(bookingId);

  if (!payment) {
    throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'Payment not found');
  }

  if (payment.buyer_id !== userId) {
    throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to view this payment');
  }

  return payment;
}

module.exports = { getPaymentByBookingId };
