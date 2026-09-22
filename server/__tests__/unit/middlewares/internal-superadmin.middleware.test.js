const { safeEqual } = require('@middlewares/internal-superadmin.middleware');

describe('internal-superadmin.middleware', () => {
  describe('safeEqual', () => {
    it('returns true only for identical tokens', () => {
      expect(safeEqual('abc123', 'abc123')).toBe(true);
      expect(safeEqual('abc123', 'abc124')).toBe(false);
    });

    it('returns false for different lengths without throwing', () => {
      expect(safeEqual('short', 'a-much-longer-token')).toBe(false);
      expect(safeEqual('', 'x')).toBe(false);
    });
  });
});
