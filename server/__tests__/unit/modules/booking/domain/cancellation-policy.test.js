const { evaluateCancellationPolicy } = require('@modules/booking/domain/cancellation-policy');

const booking = {
  total_price: '100.00',
  currency: 'USD',
  room_id: 7,
  check_in_date: '2999-01-15',
  hotel: { timezone: 'UTC', check_in_time: '14:00:00' },
};

const refundableRule = {
  id: 9,
  is_refundable: true,
  free_cancellation_until_hours_before_checkin: 24,
  refund_percent_before_deadline: 100,
  refund_percent_after_deadline: 50,
};

describe('booking/domain/cancellation-policy', () => {
  it('asks for manual review when there is no structured rule', () => {
    const result = evaluateCancellationPolicy(null, booking);

    expect(result).toMatchObject({
      eligible: false,
      eligibility: 'manual_review',
      reason: 'no_structured_rule',
      refundAmount: 0,
    });
  });

  it('marks a non-refundable rule as ineligible', () => {
    const result = evaluateCancellationPolicy({ id: 3, is_refundable: false }, booking);

    expect(result).toMatchObject({
      eligible: false,
      eligibility: 'ineligible',
      reason: 'non_refundable_rule',
      isRefundable: false,
    });
  });

  it('refunds the before-deadline percent inside the free cancellation window', () => {
    const now = new Date('2998-12-01T00:00:00Z');

    const result = evaluateCancellationPolicy(refundableRule, booking, now);

    expect(result).toMatchObject({
      eligible: true,
      eligibility: 'eligible',
      reason: 'free_cancellation',
      refundPercent: 100,
      refundAmount: 100,
      isWithinFreeCancellationWindow: true,
    });
    expect(result.freeCancellationDeadline).toEqual(new Date('2999-01-14T14:00:00Z'));
  });

  it('refunds the after-deadline percent once the window has passed', () => {
    const now = new Date('2999-01-15T00:00:00Z');

    const result = evaluateCancellationPolicy(refundableRule, booking, now);

    expect(result).toMatchObject({
      eligible: true,
      reason: 'customer_request',
      refundPercent: 50,
      refundAmount: 50,
      isWithinFreeCancellationWindow: false,
    });
  });

  it('treats a missing deadline as always within the free window', () => {
    const now = new Date('2999-01-15T00:00:00Z');
    const rule = {
      ...refundableRule,
      free_cancellation_until_hours_before_checkin: null,
      refund_percent_before_deadline: 80,
    };

    const result = evaluateCancellationPolicy(rule, booking, now);

    expect(result.isWithinFreeCancellationWindow).toBe(true);
    expect(result.refundAmount).toBe(80);
  });
});
