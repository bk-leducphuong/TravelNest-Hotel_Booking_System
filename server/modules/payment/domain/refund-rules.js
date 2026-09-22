const ApiError = require('@utils/ApiError');

/**
 * Refund rules: pure guards/computations shared by the refund use-cases.
 */

const REFUND_REASONS = [
  'free_cancellation',
  'customer_request',
  'hotel_cancelled',
  'duplicate',
  'fraudulent',
  'other',
];

// Refunds in these states count against the transaction's refundable balance.
const ACTIVE_REFUND_STATUSES = ['pending', 'processing', 'succeeded'];

const REFUNDABLE_TRANSACTION_STATUSES = ['completed', 'partially_refunded'];

// Stripe only accepts these reasons; everything else maps to customer request.
const STRIPE_REFUND_REASONS = {
  duplicate: 'duplicate',
  fraudulent: 'fraudulent',
};

function num(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toMinorUnits(amount) {
  return Math.round(round2(num(amount)) * 100);
}

function normalizeReason(reason) {
  const normalized = reason || 'customer_request';

  if (!REFUND_REASONS.includes(normalized)) {
    throw new ApiError(
      400,
      'INVALID_REFUND_REASON',
      `reason must be one of: ${REFUND_REASONS.join(', ')}`
    );
  }

  return normalized;
}

function toStripeReason(reason) {
  return STRIPE_REFUND_REASONS[reason] || 'requested_by_customer';
}

/**
 * Throw unless the transaction can be refunded at all.
 */
function assertRefundableTransaction(transaction) {
  if (!transaction) {
    throw new ApiError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
  }

  if (transaction.transaction_type !== 'payment') {
    throw new ApiError(
      400,
      'NOT_A_PAYMENT_TRANSACTION',
      'Only payment transactions can be refunded'
    );
  }

  if (!REFUNDABLE_TRANSACTION_STATUSES.includes(transaction.status)) {
    throw new ApiError(
      409,
      'TRANSACTION_NOT_REFUNDABLE',
      `Transaction status '${transaction.status}' is not refundable`
    );
  }

  if (!transaction.stripe_charge_id) {
    throw new ApiError(
      400,
      'MISSING_PROVIDER_CHARGE',
      'Transaction has no Stripe charge to refund'
    );
  }

  if (!transaction.booking_id) {
    throw new ApiError(400, 'MISSING_BOOKING_REFERENCE', 'Transaction is not linked to a booking');
  }
}

function remainingRefundable(transactionAmount, activeRefundedSum) {
  return Math.max(0, round2(num(transactionAmount) - num(activeRefundedSum)));
}

/**
 * Resolve the requested amount (defaults to the full remaining balance) and
 * validate it against the remaining refundable amount.
 */
function resolveRefundAmount(requestedAmount, remaining) {
  const amount =
    requestedAmount === undefined || requestedAmount === null
      ? remaining
      : round2(num(requestedAmount));

  if (!(amount > 0)) {
    throw new ApiError(400, 'INVALID_REFUND_AMOUNT', 'Refund amount must be greater than zero');
  }

  if (amount > remaining + 0.001) {
    throw new ApiError(
      400,
      'REFUND_EXCEEDS_REMAINING',
      `Refund amount ${amount} exceeds the remaining refundable amount ${remaining}`
    );
  }

  return amount;
}

/**
 * Transaction status after refunding.
 */
function transactionStatusForRefunded(totalRefunded, transactionAmount) {
  return num(totalRefunded) >= num(transactionAmount) - 0.01 ? 'refunded' : 'partially_refunded';
}

module.exports = {
  REFUND_REASONS,
  ACTIVE_REFUND_STATUSES,
  REFUNDABLE_TRANSACTION_STATUSES,
  normalizeReason,
  toStripeReason,
  assertRefundableTransaction,
  remainingRefundable,
  resolveRefundAmount,
  transactionStatusForRefunded,
  toMinorUnits,
  num,
  round2,
};
