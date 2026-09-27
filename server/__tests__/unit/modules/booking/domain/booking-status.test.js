const {
  BOOKING_STATUS,
  canTransition,
  assertTransition,
  isTerminal,
  requiresInventoryRelease,
} = require('@modules/booking/domain/booking-status');

describe('booking status state machine', () => {
  describe('canTransition', () => {
    it('allows confirm, check-in, complete and no-show flows', () => {
      expect(canTransition(BOOKING_STATUS.PENDING_PAYMENT, BOOKING_STATUS.CONFIRMED)).toBe(true);
      expect(canTransition(BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CHECKED_IN)).toBe(true);
      expect(canTransition(BOOKING_STATUS.CHECKED_IN, BOOKING_STATUS.COMPLETED)).toBe(true);
      expect(canTransition(BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.NO_SHOW)).toBe(true);
    });

    it('allows cancelling from non-terminal statuses', () => {
      expect(canTransition(BOOKING_STATUS.PENDING, BOOKING_STATUS.CANCELLED)).toBe(true);
      expect(canTransition(BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CANCELLED)).toBe(true);
      expect(canTransition(BOOKING_STATUS.CHECKED_IN, BOOKING_STATUS.CANCELLED)).toBe(true);
    });

    it('treats terminal statuses as final', () => {
      expect(canTransition(BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CHECKED_IN)).toBe(false);
      expect(canTransition(BOOKING_STATUS.CANCELLED, BOOKING_STATUS.CONFIRMED)).toBe(false);
      expect(canTransition(BOOKING_STATUS.EXPIRED, BOOKING_STATUS.CONFIRMED)).toBe(false);
      expect(canTransition(BOOKING_STATUS.NO_SHOW, BOOKING_STATUS.CHECKED_IN)).toBe(false);
    });

    it('rejects no-op and unknown transitions', () => {
      expect(canTransition(BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CONFIRMED)).toBe(false);
      expect(canTransition('nonsense', BOOKING_STATUS.CONFIRMED)).toBe(false);
    });
  });

  describe('assertTransition', () => {
    it('throws a 409 ApiError for invalid transitions', () => {
      expect(() => assertTransition(BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED)).toThrow(
        expect.objectContaining({
          statusCode: 409,
          code: 'INVALID_BOOKING_STATUS_TRANSITION',
        })
      );
    });
  });

  describe('isTerminal', () => {
    it('identifies terminal statuses', () => {
      expect(isTerminal(BOOKING_STATUS.COMPLETED)).toBe(true);
      expect(isTerminal(BOOKING_STATUS.CANCELLED)).toBe(true);
      expect(isTerminal(BOOKING_STATUS.CONFIRMED)).toBe(false);
    });
  });

  describe('requiresInventoryRelease', () => {
    it('releases inventory for active statuses but not terminal ones', () => {
      expect(requiresInventoryRelease(BOOKING_STATUS.CONFIRMED)).toBe(true);
      expect(requiresInventoryRelease(BOOKING_STATUS.CHECKED_IN)).toBe(true);
      expect(requiresInventoryRelease(BOOKING_STATUS.COMPLETED)).toBe(false);
      expect(requiresInventoryRelease(BOOKING_STATUS.CANCELLED)).toBe(false);
    });
  });
});
