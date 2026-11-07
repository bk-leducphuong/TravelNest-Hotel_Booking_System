const { uuidv7 } = require('uuidv7');
const sequelize = require('@config/database.config');
const ApiError = require('@utils/ApiError');
const bookings = require('../../infrastructure/booking.repository');
const { paymentModule } = require('../../infrastructure/payment.client');
const { evaluateBookingCancellationPolicy } = require('./evaluateCancellationPolicy');
const { assertTransition } = require('../../domain/booking-status');

async function cancellationContext(bookingId, userId, transaction) {
  const options = { transaction, lock: transaction.LOCK.UPDATE };
  const locked = await bookings.findById(bookingId, options);
  if (!locked || locked.buyer_id !== userId)
    throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  return bookings.findCancellationContextByIdAndBuyerId(bookingId, userId, { transaction });
}

async function calculateQuote(booking, transaction) {
  const policy = await evaluateBookingCancellationPolicy(booking);
  const { payment, amountPaid, remaining } = await paymentModule().cancellationPayment(booking.id, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  const refundAmount =
    payment?.stripe_charge_id && payment.currency.toUpperCase() === 'USD'
      ? Math.min(policy.refundAmount, remaining)
      : 0;
  const eligibility =
    amountPaid && remaining > 0
      ? !payment.stripe_charge_id || payment.currency.toUpperCase() !== 'USD'
        ? 'manual_review'
        : policy.eligibility
      : 'ineligible';
  return {
    policy,
    payment,
    remaining,
    quote: {
      amountPaid,
      amountAlreadyCommitted: Math.max(0, amountPaid - remaining),
      refundAmount: eligibility === 'manual_review' ? null : refundAmount,
      cancellationFee:
        eligibility === 'manual_review'
          ? null
          : amountPaid
            ? (policy.cancellationFee ?? amountPaid - policy.refundAmount)
            : 0,
      currency: booking.currency || 'USD',
      eligibility,
      reason: amountPaid
        ? !payment.stripe_charge_id
          ? 'missing_provider_charge'
          : payment.currency.toUpperCase() !== 'USD'
            ? 'currency_requires_review'
            : policy.reason
        : 'no_captured_payment',
      freeCancellationDeadline: policy.freeCancellationDeadline,
      destination: 'original_payment_method',
      etaDays: {
        min: Number(process.env.REFUND_ETA_MIN_BUSINESS_DAYS) || 5,
        max: Number(process.env.REFUND_ETA_MAX_BUSINESS_DAYS) || 10,
        businessDays: true,
      },
    },
  };
}

async function cancellationQuote(bookingId, userId) {
  return sequelize.transaction(async (transaction) => {
    const booking = await cancellationContext(bookingId, userId, transaction);
    assertTransition(booking.status, 'cancelled');
    const { quote } = await calculateQuote(booking, transaction);
    const issued = {
      ...quote,
      quoteId: uuidv7(),
      expiresAt: new Date(Date.now() + 5 * 60000).toISOString(),
    };
    await bookings.update(bookingId, { cancellation_quote: issued }, { transaction });
    return issued;
  });
}

async function cancellationStatus(bookingId, userId) {
  const booking = await bookings.findById(bookingId);
  if (!booking || booking.buyer_id !== userId)
    throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  const decision =
    booking.cancellation_decision ||
    (booking.status === 'cancelled'
      ? { outcome: 'manual_review', reason: 'legacy_cancellation' }
      : null);
  const refund = decision?.refundId
    ? await paymentModule().getCancellationRefund(decision.refundId)
    : null;
  return { bookingId, decision, refund };
}

module.exports = { cancellationContext, calculateQuote, cancellationQuote, cancellationStatus };
