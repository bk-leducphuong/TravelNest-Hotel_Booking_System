const PAYMENT_METHODS = ['card', 'bank_transfer', 'wallet', 'cash', 'gift_card'];

const PAYMENT_STATUSES = ['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'];

/**
 * When the guest pays for a booking.
 *
 * - `prepay`: paid online at booking time (Stripe).
 * - `pay_at_property`: confirmed without prepayment; collected by the property.
 */
const PAYMENT_POLICIES = ['prepay', 'pay_at_property'];

const PAYMENT_ACCOUNT_PROVIDERS = ['stripe'];

const PAYMENT_ACCOUNT_TYPES = ['express', 'standard', 'custom'];

const PAYMENT_ACCOUNT_ONBOARDING_STATUSES = [
  'not_started',
  'pending',
  'completed',
  'restricted',
  'disabled',
];

const PAYOUT_STATUSES = ['pending', 'processing', 'paid', 'failed', 'cancelled'];

function isValidPaymentMethod(method) {
  return PAYMENT_METHODS.includes(method);
}

function isValidPaymentStatus(status) {
  return PAYMENT_STATUSES.includes(status);
}

function isValidPaymentPolicy(policy) {
  return PAYMENT_POLICIES.includes(policy);
}

module.exports = {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PAYMENT_POLICIES,
  PAYMENT_ACCOUNT_PROVIDERS,
  PAYMENT_ACCOUNT_TYPES,
  PAYMENT_ACCOUNT_ONBOARDING_STATUSES,
  PAYOUT_STATUSES,
  isValidPaymentMethod,
  isValidPaymentStatus,
  isValidPaymentPolicy,
};
