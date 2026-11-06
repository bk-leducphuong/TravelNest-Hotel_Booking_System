import { guestMoney } from './guestPresentation';

// Refund states that can still change without staff intervention. The tracker
// may poll while one of these is current.
export const REFUND_TRANSIENT_STATES = new Set([
  'queued',
  'submitting',
  'provider_pending',
  'unknown',
  'pending',
  'processing',
]);

const REFUND_TONES = {
  manual_review: 'warning',
  no_refund: 'neutral',
  queued: 'progress',
  submitting: 'progress',
  provider_pending: 'progress',
  unknown: 'progress',
  pending: 'progress',
  processing: 'progress',
  needs_attention: 'warning',
  failed: 'warning',
  cancelled: 'warning',
  review_resolved: 'warning',
  succeeded: 'success',
};

const REFUND_SUPPORT_STATES = new Set([
  'manual_review',
  'needs_attention',
  'failed',
  'cancelled',
  'review_resolved',
]);

/**
 * Normalize the cancellation decision + refund record into one guest-facing
 * state key. Mirrors the server's `cancellationStatus` contract.
 */
export function refundState(cancellation = {}) {
  const refund = cancellation.refund;

  if (
    cancellation.outcome === 'manual_review' ||
    refund?.eligibility === 'manual_review' ||
    refund?.workflowState === 'manual_review'
  ) {
    return 'manual_review';
  }

  if (!refund) {
    return cancellation.outcome === 'no_refund' ? 'no_refund' : 'unknown';
  }

  return refund.workflowState || refund.status || 'unknown';
}

export function refundTone(state) {
  return REFUND_TONES[state] || 'neutral';
}

export function isRefundTransient(state) {
  return REFUND_TRANSIENT_STATES.has(state);
}

export function refundNeedsSupport(state) {
  return REFUND_SUPPORT_STATES.has(state);
}

export function refundMessageKey(state) {
  return `guest.cancel.status.${state}`;
}

export function refundAmountText(refund, locale = 'en') {
  if (!refund || refund.eligibility === 'manual_review') return null;
  const amount = Number(refund.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return guestMoney(amount, refund.currency || 'USD', locale);
}

/**
 * Compact chip used on a cancelled booking card in the history list.
 */
export function buildRefundChip(booking, locale = 'en') {
  // Only show refund state when the API supplied it; an older server response
  // must not look like an unresolved refund.
  if (booking?.status !== 'cancelled' || !booking.cancellation) return null;

  const cancellation = booking.cancellation;
  const state = refundState(cancellation);

  return {
    state,
    labelKey: `guest.cancel.chip.${state}`,
    tone: refundTone(state),
    amountText: refundAmountText(cancellation.refund, locale),
  };
}
