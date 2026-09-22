const ApiError = require('@utils/ApiError');

/**
 * Payout rules: status transitions and connected-account readiness. Pure.
 */

const PAYOUT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

const PAYOUT_STATUS_VALUES = Object.values(PAYOUT_STATUS);

const ALLOWED_TRANSITIONS = {
  [PAYOUT_STATUS.PENDING]: [
    PAYOUT_STATUS.PROCESSING,
    PAYOUT_STATUS.PAID,
    PAYOUT_STATUS.FAILED,
    PAYOUT_STATUS.CANCELLED,
  ],
  [PAYOUT_STATUS.PROCESSING]: [PAYOUT_STATUS.PAID, PAYOUT_STATUS.FAILED],
  [PAYOUT_STATUS.FAILED]: [
    PAYOUT_STATUS.PENDING,
    PAYOUT_STATUS.PROCESSING,
    PAYOUT_STATUS.CANCELLED,
  ],
  [PAYOUT_STATUS.PAID]: [],
  [PAYOUT_STATUS.CANCELLED]: [],
};

const TERMINAL_STATUSES = [PAYOUT_STATUS.PAID, PAYOUT_STATUS.CANCELLED];

function isValidStatus(status) {
  return PAYOUT_STATUS_VALUES.includes(status);
}

function isTerminal(status) {
  return TERMINAL_STATUSES.includes(status);
}

function canTransition(from, to) {
  if (!isValidStatus(from) || !isValidStatus(to) || from === to) {
    return false;
  }
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new ApiError(
      409,
      'INVALID_PAYOUT_STATUS_TRANSITION',
      `Cannot change payout status from '${from}' to '${to}'`
    );
  }
}

/**
 * Derive the local onboarding status from a Stripe account payload.
 */
function deriveOnboardingStatus(stripeAccount) {
  if (!stripeAccount) {
    return 'not_started';
  }
  if (stripeAccount.payouts_enabled && stripeAccount.details_submitted) {
    return 'completed';
  }
  if (stripeAccount.disabled_reason) {
    return 'restricted';
  }
  if (stripeAccount.details_submitted) {
    return 'pending';
  }
  return 'not_started';
}

function isAccountPayoutReady(account) {
  if (!account) {
    return false;
  }
  const payoutsEnabled = account.payouts_enabled ?? account.payoutsEnabled;
  const onboardingStatus = account.onboarding_status ?? account.onboardingStatus;
  return Boolean(payoutsEnabled) && onboardingStatus === 'completed';
}

module.exports = {
  PAYOUT_STATUS,
  PAYOUT_STATUS_VALUES,
  TERMINAL_STATUSES,
  isValidStatus,
  isTerminal,
  canTransition,
  assertTransition,
  deriveOnboardingStatus,
  isAccountPayoutReady,
};
