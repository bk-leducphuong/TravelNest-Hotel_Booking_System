const logger = require('@config/logger.config');
const transactionRepository = require('@repositories/transaction.repository');
const bookingRepository = require('@repositories/booking.repository');
const paymentRepository = require('../../infrastructure/payment.repository');

const { fromMinorUnits } = require('../../domain/money');

/**
 * Handle a `payment_intent.payment_failed` webhook. Idempotent.
 */
async function handlePaymentFailed(context) {
  const {
    paymentIntentId,
    transactionId,
    bookingCode,
    buyerId,
    hotelId,
    currency,
    failureCode,
    failureMessage,
  } = context;
  const amount = fromMinorUnits(context.amount, currency);

  logger.info('Processing payment failed', { paymentIntentId });

  try {
    let existing = transactionId ? await transactionRepository.findById(transactionId) : null;

    if (!existing) {
      existing = await transactionRepository.findByPaymentIntentId(paymentIntentId);
    }

    if (existing && existing.status === 'failed') {
      logger.info('Payment failure already recorded (idempotent)', { paymentIntentId });
      return { success: true, alreadyProcessed: true };
    }

    if (!existing) {
      const transaction = await transactionRepository.create({
        buyer_id: buyerId,
        hotel_id: hotelId,
        amount,
        currency: currency.toUpperCase(),
        status: 'failed',
        transactionType: 'payment',
        paymentIntentId,
      });

      await paymentRepository.create({
        transaction_id: transaction.id,
        amount,
        currency: currency.toUpperCase(),
        payment_method: context.paymentMethod || 'unknown',
        payment_status: 'failed',
        failure_code: failureCode,
        failure_message: failureMessage,
        paid_at: new Date(),
      });
    } else {
      await transactionRepository.update(existing.id, {
        status: 'failed',
        failureCode,
        failureMessage,
      });
    }

    if (bookingCode) {
      await bookingRepository.updateByBookingCode(bookingCode, {
        status: 'payment_failed',
      });
    }

    logger.info('Payment failed processed successfully', { paymentIntentId });

    return { success: true };
  } catch (error) {
    logger.error('Error processing payment failed:', error);
    throw error;
  }
}

module.exports = { handlePaymentFailed };
