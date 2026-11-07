const { PAYMENT_POLICIES } = require('@constants/payment');

/**
 * Booking payment-condition rules (pure).
 *
 * A booking is paid either online at booking time (`prepay`) or at the property
 * (`pay_at_property`). Room-level rules may disagree, so the booking resolves to
 * the conservative option: if any room requires prepayment, the whole booking
 * requires prepayment.
 */

const PAYMENT_POLICY = {
  PREPAY: 'prepay',
  PAY_AT_PROPERTY: 'pay_at_property',
};

function normalizePaymentPolicy(value) {
  return PAYMENT_POLICIES.includes(value) ? value : PAYMENT_POLICY.PREPAY;
}

/**
 * Resolve the booking-level policy from per-room policies.
 *
 * @param {Array<string|{paymentPolicy?: string, payment_policy?: string}>} rooms
 * @returns {'prepay'|'pay_at_property'}
 */
function resolvePaymentPolicy(rooms = []) {
  if (!Array.isArray(rooms) || rooms.length === 0) return PAYMENT_POLICY.PREPAY;

  const policies = rooms.map((room) => {
    if (typeof room === 'string') return normalizePaymentPolicy(room);
    return normalizePaymentPolicy(room?.paymentPolicy ?? room?.payment_policy);
  });

  return policies.every((policy) => policy === PAYMENT_POLICY.PAY_AT_PROPERTY)
    ? PAYMENT_POLICY.PAY_AT_PROPERTY
    : PAYMENT_POLICY.PREPAY;
}

function requiresPrepayment(policy) {
  return normalizePaymentPolicy(policy) !== PAYMENT_POLICY.PAY_AT_PROPERTY;
}

module.exports = {
  PAYMENT_POLICY,
  normalizePaymentPolicy,
  resolvePaymentPolicy,
  requiresPrepayment,
};
