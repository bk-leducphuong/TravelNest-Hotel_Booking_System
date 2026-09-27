const {
  normalizeReason,
  toStripeReason,
  assertRefundableTransaction,
  remainingRefundable,
  resolveRefundAmount,
  transactionStatusForRefunded,
  toMinorUnits,
} = require('@modules/payment/domain/refund-rules');

describe('refund rules', () => {
  const refundableTransaction = {
    id: 'tx-1',
    transaction_type: 'payment',
    status: 'completed',
    stripe_charge_id: 'ch_123',
    booking_id: 'bk-1',
    amount: '100.00',
    currency: 'USD',
  };

  describe('normalizeReason', () => {
    it('defaults and validates reasons', () => {
      expect(normalizeReason()).toBe('customer_request');
      expect(normalizeReason('fraudulent')).toBe('fraudulent');
      expect(() => normalizeReason('nonsense')).toThrow(
        expect.objectContaining({ code: 'INVALID_REFUND_REASON' })
      );
    });
  });

  describe('toStripeReason', () => {
    it('maps unsupported reasons to requested_by_customer', () => {
      expect(toStripeReason('duplicate')).toBe('duplicate');
      expect(toStripeReason('fraudulent')).toBe('fraudulent');
      expect(toStripeReason('free_cancellation')).toBe('requested_by_customer');
      expect(toStripeReason('other')).toBe('requested_by_customer');
    });
  });

  describe('assertRefundableTransaction', () => {
    it('accepts a completed payment transaction with a charge', () => {
      expect(() => assertRefundableTransaction(refundableTransaction)).not.toThrow();
    });

    it('rejects missing, non-payment, non-refundable and unlinked transactions', () => {
      expect(() => assertRefundableTransaction(null)).toThrow(
        expect.objectContaining({ statusCode: 404 })
      );
      expect(() =>
        assertRefundableTransaction({ ...refundableTransaction, transaction_type: 'payout' })
      ).toThrow(expect.objectContaining({ code: 'NOT_A_PAYMENT_TRANSACTION' }));
      expect(() =>
        assertRefundableTransaction({ ...refundableTransaction, status: 'pending' })
      ).toThrow(expect.objectContaining({ code: 'TRANSACTION_NOT_REFUNDABLE' }));
      expect(() =>
        assertRefundableTransaction({ ...refundableTransaction, stripe_charge_id: null })
      ).toThrow(expect.objectContaining({ code: 'MISSING_PROVIDER_CHARGE' }));
      expect(() =>
        assertRefundableTransaction({ ...refundableTransaction, booking_id: null })
      ).toThrow(expect.objectContaining({ code: 'MISSING_BOOKING_REFERENCE' }));
    });
  });

  describe('remainingRefundable', () => {
    it('subtracts active refunds and never goes negative', () => {
      expect(remainingRefundable('100.00', '30.00')).toBe(70);
      expect(remainingRefundable('100.00', '150.00')).toBe(0);
      expect(remainingRefundable(100, 0)).toBe(100);
    });
  });

  describe('resolveRefundAmount', () => {
    it('defaults to the full remaining balance', () => {
      expect(resolveRefundAmount(undefined, 70)).toBe(70);
      expect(resolveRefundAmount(25.5, 70)).toBe(25.5);
    });

    it('rejects zero/negative and over-remaining amounts', () => {
      expect(() => resolveRefundAmount(0, 70)).toThrow(
        expect.objectContaining({ code: 'INVALID_REFUND_AMOUNT' })
      );
      expect(() => resolveRefundAmount(80, 70)).toThrow(
        expect.objectContaining({ code: 'REFUND_EXCEEDS_REMAINING' })
      );
    });
  });

  describe('transactionStatusForRefunded', () => {
    it('marks full refunds as refunded and partial ones as partially_refunded', () => {
      expect(transactionStatusForRefunded(100, '100.00')).toBe('refunded');
      expect(transactionStatusForRefunded(99.5, '100.00')).toBe('partially_refunded');
    });
  });

  describe('toMinorUnits', () => {
    it('converts decimal amounts to cents', () => {
      expect(toMinorUnits(10)).toBe(1000);
      expect(toMinorUnits('25.5')).toBe(2550);
      expect(toMinorUnits(0.1)).toBe(10);
    });
  });
});
