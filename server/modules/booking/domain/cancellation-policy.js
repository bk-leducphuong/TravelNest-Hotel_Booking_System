const { getHotelCheckInDateTime } = require('./check-in-time');

/**
 * Cancellation policy rules (pure).
 *
 * Given a cancellation rule (or none), a booking and "now", decide how much of
 * the booking is refundable. Room-specific rules are resolved by the caller.
 */

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function evaluateCancellationPolicy(rule, booking, now = new Date()) {
  const amount = parseFloat(booking.total_price);
  const currency = booking.currency || 'USD';

  if (!rule) {
    return {
      eligible: false,
      eligibility: 'manual_review',
      reason: 'no_structured_rule',
      refundAmount: 0,
      refundPercent: 0,
      currency,
      isRefundable: false,
      freeCancellationDeadline: null,
      isWithinFreeCancellationWindow: false,
    };
  }

  const ruleData = rule.toJSON ? rule.toJSON() : rule;

  if (!ruleData.is_refundable) {
    return {
      eligible: false,
      eligibility: 'ineligible',
      reason: 'non_refundable_rule',
      refundAmount: 0,
      refundPercent: 0,
      currency,
      isRefundable: false,
      ruleId: ruleData.id,
      freeCancellationDeadline: null,
      isWithinFreeCancellationWindow: false,
    };
  }

  const hotel = booking.hotel || {};
  const timezone = hotel.timezone || 'UTC';
  const checkInDateTime = getHotelCheckInDateTime(
    booking.check_in_date,
    hotel.check_in_time,
    timezone
  );
  const freeCancellationDeadline =
    ruleData.free_cancellation_until_hours_before_checkin === null ||
    ruleData.free_cancellation_until_hours_before_checkin === undefined
      ? null
      : new Date(
          checkInDateTime.getTime() -
            ruleData.free_cancellation_until_hours_before_checkin * 60 * 60 * 1000
        );
  const isWithinFreeCancellationWindow =
    freeCancellationDeadline === null || now <= freeCancellationDeadline;
  const refundPercent = isWithinFreeCancellationWindow
    ? parseFloat(ruleData.refund_percent_before_deadline)
    : parseFloat(ruleData.refund_percent_after_deadline);
  const refundAmount = roundMoney((amount * refundPercent) / 100);

  return {
    eligible: refundAmount > 0,
    eligibility: refundAmount > 0 ? 'eligible' : 'ineligible',
    reason: isWithinFreeCancellationWindow ? 'free_cancellation' : 'customer_request',
    refundAmount,
    refundPercent,
    currency,
    isRefundable: true,
    ruleId: ruleData.id,
    freeCancellationDeadline,
    isWithinFreeCancellationWindow,
  };
}

module.exports = { evaluateCancellationPolicy };
