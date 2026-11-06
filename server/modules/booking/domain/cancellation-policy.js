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

/** Evaluate only the terms recorded at booking time; never reconstruct history from live rules. */
function evaluateSnapshot(booking, now = new Date()) {
  const snapshot = booking.cancellation_policy_snapshot;
  const manual = {
    ...evaluateCancellationPolicy(null, booking, now),
    reason: 'missing_policy_snapshot',
  };
  if (snapshot?.version !== 2 || !snapshot.rooms?.length) return manual;
  let minor = 0;
  let totalMinor = 0;
  const deadlines = [];
  for (const room of snapshot.rooms) {
    if (!room.ruleId || !Number.isSafeInteger(room.amountMinor) || room.amountMinor < 0)
      return manual;
    const deadline = room.freeCancellationDeadline ? new Date(room.freeCancellationDeadline) : null;
    if (deadline && !Number.isFinite(deadline.getTime())) return manual;
    const before = !deadline || now <= deadline;
    const percent = Number(
      before ? room.refundPercentBeforeDeadline : room.refundPercentAfterDeadline
    );
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) return manual;
    totalMinor += room.amountMinor;
    minor += room.isRefundable ? Math.round((room.amountMinor * percent) / 100) : 0;
    if (deadline) deadlines.push(deadline.toISOString());
  }
  if (totalMinor !== Math.round(Number(booking.total_price) * 100)) return manual;
  return {
    eligible: minor > 0,
    eligibility: minor > 0 ? 'eligible' : 'ineligible',
    reason: minor > 0 ? 'customer_request' : 'non_refundable_rule',
    refundAmount: minor / 100,
    cancellationFee: (totalMinor - minor) / 100,
    currency: booking.currency || 'USD',
    freeCancellationDeadline: deadlines.sort()[0] || null,
    isRefundable: minor > 0,
  };
}

module.exports = { evaluateCancellationPolicy, evaluateSnapshot };
