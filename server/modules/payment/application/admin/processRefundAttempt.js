const ApiError = require('@utils/ApiError');
const { eventBus, DOMAIN_EVENTS } = require('@platform/events');
const { auditService } = require('@platform/audit');
const ledgerService = require('@services/ledger.service');
const StripePaymentAdapter = require('@adapters/payment/stripePayment.adapter');

const refundRepository = require('../../infrastructure/refund.repository');
const transactionRepository = require('../../infrastructure/transaction.repository');
const {
  toMinorUnits,
  toStripeReason,
  transactionStatusForRefunded,
  round2,
} = require('../../domain/refund-rules');

const paymentProvider = new StripePaymentAdapter();

/**
 * Perform a single refund attempt against Stripe and reconcile local state.
 *
 * Shared by initiate-refund and retry-refund. Not exported from the module.
 */
async function processRefundAttempt({ refund, transaction, reason, actorUserId, requestId }) {
  const bookingCode = transaction.booking?.booking_code || null;

  try {
    const stripeRefund = await paymentProvider.refundCharge({
      chargeId: transaction.stripe_charge_id,
      amount: toMinorUnits(refund.amount),
      reason: toStripeReason(reason),
      metadata: {
        booking_id: transaction.booking_id,
        transaction_id: transaction.id,
        refund_record_id: refund.id,
      },
    });

    const status = stripeRefund.status;
    const processedAt = status === 'succeeded' ? new Date() : null;

    await refundRepository.update(refund.id, {
      providerRefundId: stripeRefund.id,
      status,
      processedAt,
      metadata: {
        ...(refund.metadata || {}),
        stripe_refund_id: stripeRefund.id,
        stripe_refund_status: stripeRefund.raw?.status,
      },
    });

    const updatedRefund = await refundRepository.findById(refund.id);
    const totalRefunded = await refundRepository.sumSucceededForTransaction(transaction.id);
    const transactionStatus = transactionStatusForRefunded(totalRefunded, transaction.amount);
    await transactionRepository.updateStatus(transaction.id, transactionStatus);

    if (status === 'succeeded') {
      await ledgerService.recordRefundSucceeded({
        refund: updatedRefund.toJSON ? updatedRefund.toJSON() : updatedRefund,
        transaction: transaction.toJSON ? transaction.toJSON() : transaction,
      });
    }

    const payload = {
      refundId: refund.id,
      transactionId: transaction.id,
      bookingId: transaction.booking_id,
      bookingCode,
      hotelId: transaction.hotel_id,
      buyerId: transaction.buyer_id,
      amount: round2(refund.amount),
      currency: refund.currency,
      status,
      transactionStatus,
      fullRefund: transactionStatus === 'refunded',
    };

    await auditService.record({
      actorUserId,
      actorType: actorUserId ? 'user' : 'system',
      action: status === 'succeeded' ? 'payment.refund_succeeded' : `payment.refund_${status}`,
      entityType: 'refund',
      entityId: refund.id,
      hotelId: transaction.hotel_id,
      after: payload,
      reason,
      requestId,
    });

    if (status === 'succeeded') {
      await eventBus.publish(DOMAIN_EVENTS.PAYMENT_REFUND_SUCCEEDED, payload);
    } else if (status === 'failed' || status === 'cancelled') {
      await eventBus.publish(DOMAIN_EVENTS.PAYMENT_REFUND_FAILED, payload);
    }

    return {
      refundId: refund.id,
      providerRefundId: stripeRefund.id,
      status,
      amount: round2(refund.amount),
      currency: refund.currency,
      transactionStatus,
    };
  } catch (error) {
    await refundRepository.update(refund.id, {
      status: 'failed',
      processedAt: new Date(),
      failureCode: error.code || 'stripe_refund_failed',
      failureMessage: error.message,
    });

    await auditService.record({
      actorUserId,
      actorType: actorUserId ? 'user' : 'system',
      action: 'payment.refund_failed',
      entityType: 'refund',
      entityId: refund.id,
      hotelId: transaction.hotel_id,
      after: { error: error.message, code: error.code },
      reason,
      requestId,
    });

    await eventBus.publish(DOMAIN_EVENTS.PAYMENT_REFUND_FAILED, {
      refundId: refund.id,
      transactionId: transaction.id,
      bookingId: transaction.booking_id,
      bookingCode,
      hotelId: transaction.hotel_id,
      buyerId: transaction.buyer_id,
      amount: round2(refund.amount),
      currency: refund.currency,
      error: error.message,
    });

    throw new ApiError(502, 'REFUND_FAILED', error.message || 'Refund failed');
  }
}

module.exports = { processRefundAttempt };
