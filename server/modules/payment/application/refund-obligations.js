const sequelize = require('@config/database.config');
const ApiError = require('@utils/ApiError');
const { uuidv7 } = require('uuidv7');
const refunds = require('../infrastructure/refund.repository');
const transactions = require('../infrastructure/transaction-admin.repository');
const outbox = require('../infrastructure/outbox.repository');
const {
  normalizeReason,
  assertRefundableTransaction,
  remainingRefundable,
  resolveRefundAmount,
  round2,
} = require('../domain/refund-rules');

function presentRefund(refund) {
  if (!refund) return null;
  return {
    refundId: refund.id,
    refundRecordId: refund.id,
    providerRefundId: refund.provider_refund_id,
    amount: Number(refund.amount),
    currency: refund.currency,
    status: refund.status,
    workflowState: refund.workflow_state,
    eligibility: refund.eligibility,
  };
}

async function cancellationPayment(bookingId, options = {}) {
  const payment = await transactions.findByBookingId(bookingId, options);
  const paid = payment && ['completed', 'partially_refunded', 'refunded'].includes(payment.status);
  const reserved = payment ? await refunds.sumActiveForTransaction(payment.id, options) : 0;
  return {
    payment,
    amountPaid: paid ? Number(payment.amount) : 0,
    remaining: paid ? remainingRefundable(payment.amount, reserved) : 0,
  };
}

/** Caller holds the booking lock first and the payment lock second. No network I/O. */
async function createObligation(
  payment,
  { amount, reason, key, source, actorUserId, quote },
  options
) {
  if (!options?.transaction) throw new Error('Refund obligations require a database transaction');
  const existing = await refunds.findByKey(key, options);
  if (existing) return presentRefund(existing);
  assertRefundableTransaction(payment);
  if (payment.currency?.toUpperCase() !== 'USD')
    throw new ApiError(
      409,
      'REFUND_CURRENCY_UNSUPPORTED',
      'This refund requires manual currency review'
    );
  await require('../infrastructure/ledger.repository').lockHotelBalance(
    payment.hotel_id,
    payment.currency,
    options
  );
  const reserved = await refunds.sumActiveForTransaction(payment.id, options);
  const resolvedAmount = resolveRefundAmount(amount, remainingRefundable(payment.amount, reserved));
  const refund = await refunds.create(
    {
      bookingId: payment.booking_id,
      transactionId: payment.id,
      buyerId: payment.buyer_id,
      hotelId: payment.hotel_id,
      amount: resolvedAmount,
      currency: payment.currency,
      reason: normalizeReason(reason),
      eligibility: 'eligible',
      status: 'pending',
      workflowState: 'queued',
      idempotencyKey: key,
      metadata: { source, initiated_by: actorUserId || null, quote: quote || null },
    },
    options
  );
  await outbox.record(
    `refund-created-${refund.id}`,
    'payment.refund_created',
    {
      refundId: refund.id,
      transactionId: payment.id,
      bookingId: payment.booking_id,
      hotelId: payment.hotel_id,
      buyerId: payment.buyer_id,
      amount: resolvedAmount,
      currency: payment.currency,
    },
    options
  );
  return presentRefund(refund);
}

async function recordCancellationReview(payment, quote, options) {
  if (!payment) return null;
  await require('../infrastructure/ledger.repository').lockHotelBalance(
    payment.hotel_id,
    payment.currency,
    options
  );
  const refund = await refunds.create(
    {
      bookingId: payment.booking_id,
      transactionId: payment.id,
      buyerId: payment.buyer_id,
      hotelId: payment.hotel_id,
      amount: 0,
      currency: payment.currency,
      status: 'pending',
      reason: 'other',
      eligibility: 'manual_review',
      workflowState: 'manual_review',
      idempotencyKey: `cancellation-review-${payment.booking_id}`,
      metadata: { source: 'cancellation_review', quote },
    },
    options
  );
  await outbox.record(
    `refund-review-${refund.id}`,
    'payment.refund_failed',
    {
      refundId: refund.id,
      hotelId: payment.hotel_id,
      bookingId: payment.booking_id,
      needsAttention: true,
      reason: quote.reason,
    },
    options
  );
  return presentRefund(refund);
}

async function queueRefund(transactionId, payload = {}, context = {}) {
  const initial = await transactions.findById(transactionId);
  if (!initial) throw new ApiError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
  return sequelize.transaction(async (transaction) => {
    const options = { transaction, lock: transaction.LOCK.UPDATE };
    const bookingModule = require('@modules/booking');
    const booking = await bookingModule.getBookingForPayment(initial.booking_id, options);
    const payment = await transactions.findById(transactionId, options);
    const key = context.reviewId
      ? `review-resolution-${context.reviewId}`
      : context.idempotencyKey || `admin-refund-${uuidv7()}`;
    const existing = await refunds.findByKey(key, options);
    if (existing) {
      if (
        existing.transaction_id !== transactionId ||
        (payload.amount !== null &&
          payload.amount !== undefined &&
          Number(existing.amount) !== round2(Number(payload.amount))) ||
        existing.reason !== normalizeReason(payload.reason)
      ) {
        throw new ApiError(
          409,
          'IDEMPOTENCY_KEY_REUSED',
          'Refund key was reused for a different request'
        );
      }
      if (context.reviewId) {
        const priorReview = await refunds.findById(context.reviewId, options);
        if (priorReview?.metadata?.reason !== context.reviewReason)
          throw new ApiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Review decision reason changed');
      }
      return presentRefund(existing);
    }
    if (context.reviewId) {
      const resolved = await refunds.findById(context.reviewId, options);
      if (
        resolved?.transaction_id === transactionId &&
        resolved.workflow_state === 'review_resolved' &&
        Number(payload.amount) === 0 &&
        resolved.metadata?.resolvedAmount === 0
      ) {
        if (resolved.metadata.reason !== context.reviewReason)
          throw new ApiError(409, 'IDEMPOTENCY_KEY_REUSED', 'Review decision reason changed');
        return {
          refundId: resolved.id,
          status: 'cancelled',
          amount: 0,
          currency: resolved.currency,
          workflowState: 'review_resolved',
        };
      }
    }
    let replacesFailedCancellation = false;
    if (
      booking?.status === 'cancelled' &&
      booking.cancellation_decision?.outcome === 'refund_required'
    ) {
      const prior = await refunds.findById(booking.cancellation_decision.refundId, options);
      if (prior && ['failed', 'cancelled'].includes(prior.status)) {
        const committed = await refunds.sumActiveForTransaction(payment.id, options);
        const owed = Math.max(
          0,
          Number(booking.cancellation_decision.approvedRefundAmount || 0) +
            Number(booking.cancellation_decision.quote?.amountAlreadyCommitted || 0) -
            committed
        );
        if (
          payload.amount !== undefined &&
          payload.amount !== null &&
          round2(Number(payload.amount)) < owed
        ) {
          throw new ApiError(
            409,
            'REFUND_BELOW_OBLIGATION',
            'A replacement must cover the outstanding cancellation refund'
          );
        }
        replacesFailedCancellation = true;
      }
    }
    const review = await refunds.findReviewForTransaction(transactionId, options);
    if (context.reviewId && review?.id !== context.reviewId)
      throw new ApiError(409, 'REVIEW_ALREADY_RESOLVED', 'Review already resolved');
    if (review)
      await refunds.update(
        review.id,
        {
          status: 'cancelled',
          workflow_state: 'review_resolved',
          metadata: {
            ...(review.metadata || {}),
            resolvedBy: context.actorUserId,
            resolvedAmount: payload.amount ?? null,
            resolvedAt: new Date().toISOString(),
            reason: context.reviewReason || payload.reason,
          },
        },
        options
      );
    const refund =
      context.reviewId && payload.amount === 0
        ? null
        : await createObligation(
            payment,
            { ...payload, key, source: 'admin', actorUserId: context.actorUserId },
            options
          );
    if (replacesFailedCancellation && refund) {
      await bookingModule.updateBookingForPayment(
        booking.id,
        {
          cancellation_decision: {
            ...booking.cancellation_decision,
            refundId: refund.refundId,
            replacement: {
              previousRefundId: booking.cancellation_decision.refundId,
              actorUserId: context.actorUserId,
              requestedAt: new Date().toISOString(),
              reason: payload.reason,
            },
          },
        },
        { transaction }
      );
    }
    if (review) {
      const decision = {
        ...(booking.cancellation_decision || {}),
        originalOutcome: 'manual_review',
        approvedRefundAmount: refund?.amount || 0,
        outcome: refund ? 'refund_required' : 'no_refund',
        refundId: refund?.refundId || null,
        resolution: {
          actorUserId: context.actorUserId,
          reason: context.reviewReason || payload.reason,
          amount: refund?.amount || 0,
          resolvedAt: new Date().toISOString(),
        },
      };
      await bookingModule.updateBookingForPayment(
        booking.id,
        { cancellation_decision: decision },
        { transaction }
      );
      await outbox.record(
        `review-resolved-${review.id}`,
        'booking.cancellation_review_resolved',
        { bookingId: booking.id, hotelId: payment.hotel_id, decision },
        options
      );
    }
    return (
      refund || {
        refundId: review.id,
        status: 'cancelled',
        amount: 0,
        currency: payment.currency,
        workflowState: 'review_resolved',
      }
    );
  });
}

module.exports = {
  cancellationPayment,
  createObligation,
  queueRefund,
  presentRefund,
  recordCancellationReview,
};
