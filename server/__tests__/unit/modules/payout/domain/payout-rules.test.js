const {
  PAYOUT_STATUS,
  canTransition,
  assertTransition,
  isTerminal,
  deriveOnboardingStatus,
  isAccountPayoutReady,
} = require('@modules/payout/domain/payout-rules');

describe('payout rules', () => {
  describe('status transitions', () => {
    it('allows pending to progress and failed to be retried', () => {
      expect(canTransition(PAYOUT_STATUS.PENDING, PAYOUT_STATUS.PROCESSING)).toBe(true);
      expect(canTransition(PAYOUT_STATUS.PENDING, PAYOUT_STATUS.PAID)).toBe(true);
      expect(canTransition(PAYOUT_STATUS.PROCESSING, PAYOUT_STATUS.PAID)).toBe(true);
      expect(canTransition(PAYOUT_STATUS.FAILED, PAYOUT_STATUS.PENDING)).toBe(true);
    });

    it('treats paid and cancelled as terminal', () => {
      expect(canTransition(PAYOUT_STATUS.PAID, PAYOUT_STATUS.FAILED)).toBe(false);
      expect(canTransition(PAYOUT_STATUS.CANCELLED, PAYOUT_STATUS.PENDING)).toBe(false);
      expect(isTerminal(PAYOUT_STATUS.PAID)).toBe(true);
      expect(isTerminal(PAYOUT_STATUS.PENDING)).toBe(false);
    });

    it('rejects no-op and unknown transitions', () => {
      expect(canTransition(PAYOUT_STATUS.PENDING, PAYOUT_STATUS.PENDING)).toBe(false);
      expect(canTransition('nonsense', PAYOUT_STATUS.PAID)).toBe(false);
    });

    it('throws an ApiError for invalid transitions', () => {
      expect(() => assertTransition(PAYOUT_STATUS.PAID, PAYOUT_STATUS.FAILED)).toThrow(
        expect.objectContaining({ statusCode: 409, code: 'INVALID_PAYOUT_STATUS_TRANSITION' })
      );
    });
  });

  describe('deriveOnboardingStatus', () => {
    it('derives onboarding status from a Stripe account payload', () => {
      expect(deriveOnboardingStatus({ payouts_enabled: true, details_submitted: true })).toBe(
        'completed'
      );
      expect(deriveOnboardingStatus({ details_submitted: true })).toBe('pending');
      expect(deriveOnboardingStatus({ disabled_reason: 'requirements.past_due' })).toBe(
        'restricted'
      );
      expect(deriveOnboardingStatus({})).toBe('not_started');
      expect(deriveOnboardingStatus(null)).toBe('not_started');
    });
  });

  describe('isAccountPayoutReady', () => {
    it('requires payouts enabled and completed onboarding', () => {
      expect(isAccountPayoutReady({ payouts_enabled: true, onboarding_status: 'completed' })).toBe(
        true
      );
      expect(isAccountPayoutReady({ payouts_enabled: true, onboarding_status: 'pending' })).toBe(
        false
      );
      expect(isAccountPayoutReady(null)).toBe(false);
    });
  });
});
