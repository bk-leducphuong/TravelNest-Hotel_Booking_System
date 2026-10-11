const {
  safeEqual,
  requireInternalSuperadminToken,
} = require('@middlewares/internal-superadmin.middleware');

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

  describe('requireInternalSuperadminToken', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    function requestWithToken(token) {
      return global.testUtils.mockRequest({
        get: jest.fn((header) =>
          header.toLowerCase() === 'x-internal-superadmin-token' ? token : undefined
        ),
      });
    }

    it('allows a caller presenting the configured token', () => {
      process.env.INTERNAL_SUPERADMIN_TOKEN = 'secret-token';
      const next = global.testUtils.mockNext();

      requireInternalSuperadminToken(requestWithToken('secret-token'), {}, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('rejects a missing or wrong token', () => {
      process.env.INTERNAL_SUPERADMIN_TOKEN = 'secret-token';
      const next = global.testUtils.mockNext();

      requireInternalSuperadminToken(requestWithToken('wrong'), {}, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          code: 'INTERNAL_SUPERADMIN_TOKEN_REQUIRED',
        })
      );
    });

    it('rejects when no token is configured (an admin bearer is not enough)', () => {
      delete process.env.INTERNAL_SUPERADMIN_TOKEN;
      delete process.env.SUPERADMIN_API_TOKEN;
      const next = global.testUtils.mockNext();

      requireInternalSuperadminToken(requestWithToken('anything'), {}, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });
  });
});
