const {
  PAYMENT_POLICY,
  normalizePaymentPolicy,
  resolvePaymentPolicy,
  requiresPrepayment,
} = require('@modules/booking/domain/payment-policy');

describe('booking/domain/payment-policy', () => {
  it('defaults unknown or missing values to prepay', () => {
    expect(normalizePaymentPolicy(undefined)).toBe('prepay');
    expect(normalizePaymentPolicy('bogus')).toBe('prepay');
    expect(normalizePaymentPolicy('pay_at_property')).toBe('pay_at_property');
  });

  it('defaults an empty room list to prepay', () => {
    expect(resolvePaymentPolicy([])).toBe(PAYMENT_POLICY.PREPAY);
    expect(resolvePaymentPolicy()).toBe(PAYMENT_POLICY.PREPAY);
  });

  it('returns pay_at_property only when every room allows it', () => {
    expect(
      resolvePaymentPolicy([
        { payment_policy: 'pay_at_property' },
        { paymentPolicy: 'pay_at_property' },
      ])
    ).toBe(PAYMENT_POLICY.PAY_AT_PROPERTY);
  });

  it('falls back to prepay when any room requires prepayment', () => {
    expect(resolvePaymentPolicy(['pay_at_property', 'prepay'])).toBe(PAYMENT_POLICY.PREPAY);
    expect(resolvePaymentPolicy([{ payment_policy: 'pay_at_property' }, {}])).toBe(
      PAYMENT_POLICY.PREPAY
    );
  });

  it('reports whether a policy requires online prepayment', () => {
    expect(requiresPrepayment('prepay')).toBe(true);
    expect(requiresPrepayment(undefined)).toBe(true);
    expect(requiresPrepayment('pay_at_property')).toBe(false);
  });
});
