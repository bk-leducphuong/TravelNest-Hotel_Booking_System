const ApiError = require('@utils/ApiError');
const bookingRepository = require('../../infrastructure/booking.repository');
const { paymentModule } = require('../../infrastructure/payment.client');

const { toMinorUnits } = require('../../domain/money');

/**
 * Create (or reuse) the Stripe PaymentIntent for a pending-payment booking.
 *
 * @param {number|string} bookingId
 * @param {number} userId
 * @param {{ paymentMethodId?: string, paymentMethod?: string }} data
 * @returns {Promise<object>} clientSecret + payment intent details
 */
async function createPaymentIntentForBooking(bookingId, userId, data = {}) {
  const booking = await bookingRepository.findPaymentContextByIdAndBuyerId(bookingId, userId);

  if (!booking) {
    throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  }

  const bookingData = booking.toJSON ? booking.toJSON() : booking;
  if (bookingData.status !== 'pending_payment') {
    throw new ApiError(
      400,
      'BOOKING_NOT_PENDING_PAYMENT',
      'Only pending payment bookings can create a payment intent'
    );
  }

  if (bookingData.payment_due_at && new Date(bookingData.payment_due_at) <= new Date()) {
    throw new ApiError(400, 'BOOKING_PAYMENT_EXPIRED', 'Booking payment window expired');
  }

  const dbTransaction = bookingData.transaction;
  if (!dbTransaction) {
    throw new ApiError(500, 'TRANSACTION_NOT_FOUND', 'Pending transaction not found');
  }

  if (dbTransaction.stripe_payment_intent_id) {
    const payment = await paymentModule().paymentProvider.getPayment(
      dbTransaction.stripe_payment_intent_id
    );
    return {
      clientSecret: payment.raw?.client_secret,
      paymentIntentId: payment.id,
      status: payment.status,
      bookingId: bookingData.id,
      bookingCode: bookingData.booking_code,
    };
  }

  const payment = await paymentModule().paymentProvider.createPayment({
    amount: toMinorUnits(bookingData.total_price, 'USD'),
    currency: 'USD',
    paymentMethodId: data.paymentMethodId,
    returnUrl: process.env.CLIENT_HOST
      ? `${process.env.CLIENT_HOST}/book/complete`
      : 'http://localhost:5173/book/complete',
    metadata: {
      booking_id: bookingData.id,
      booking_code: bookingData.booking_code,
      transaction_id: dbTransaction.id,
      hotel_id: bookingData.hotel_id,
      buyer_id: userId,
    },
  });

  await paymentModule().updateTransaction(dbTransaction.id, {
    paymentIntentId: payment.id,
    paymentMethod: data.paymentMethod || 'card',
    metadata: {
      ...(dbTransaction.metadata || {}),
      booking_code: bookingData.booking_code,
      stripe_payment_intent_status: payment.status,
    },
  });

  return {
    clientSecret: payment.clientSecret,
    paymentIntentId: payment.id,
    status: payment.status,
    bookingId: bookingData.id,
    bookingCode: bookingData.booking_code,
  };
}

module.exports = { createPaymentIntentForBooking };
