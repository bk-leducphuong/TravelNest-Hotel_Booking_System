const {
  REVIEW_STATUS,
  canTransition,
  assertTransition,
} = require('@modules/review/domain/review-status');

describe('review-status state machine', () => {
  describe('canTransition', () => {
    it('allows a published review to be hidden or deleted', () => {
      expect(canTransition(REVIEW_STATUS.PUBLISHED, REVIEW_STATUS.HIDDEN)).toBe(true);
      expect(canTransition(REVIEW_STATUS.PUBLISHED, REVIEW_STATUS.DELETED)).toBe(true);
    });

    it('allows a hidden review to be restored or deleted', () => {
      expect(canTransition(REVIEW_STATUS.HIDDEN, REVIEW_STATUS.PUBLISHED)).toBe(true);
      expect(canTransition(REVIEW_STATUS.HIDDEN, REVIEW_STATUS.DELETED)).toBe(true);
    });

    it('treats deleted as terminal', () => {
      expect(canTransition(REVIEW_STATUS.DELETED, REVIEW_STATUS.PUBLISHED)).toBe(false);
      expect(canTransition(REVIEW_STATUS.DELETED, REVIEW_STATUS.HIDDEN)).toBe(false);
    });

    it('rejects no-op and unknown transitions', () => {
      expect(canTransition(REVIEW_STATUS.PUBLISHED, REVIEW_STATUS.PUBLISHED)).toBe(false);
      expect(canTransition('pending', REVIEW_STATUS.PUBLISHED)).toBe(false);
      expect(canTransition(REVIEW_STATUS.PUBLISHED, 'nonsense')).toBe(false);
    });
  });

  describe('assertTransition', () => {
    it('does not throw for a valid transition', () => {
      expect(() => assertTransition(REVIEW_STATUS.PUBLISHED, REVIEW_STATUS.HIDDEN)).not.toThrow();
    });

    it('throws an ApiError for an invalid transition', () => {
      expect(() => assertTransition(REVIEW_STATUS.DELETED, REVIEW_STATUS.PUBLISHED)).toThrow(
        expect.objectContaining({
          statusCode: 409,
          code: 'INVALID_REVIEW_STATUS_TRANSITION',
        })
      );
    });
  });
});
