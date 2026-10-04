const { fromMinorUnits, toMinorUnits } = require('@modules/payment/domain/money');

describe('payment/domain/money', () => {
  describe('toMinorUnits', () => {
    it('treats USD as two-decimal', () => {
      expect(toMinorUnits(10, 'USD')).toBe(1000);
      expect(toMinorUnits('12.34', 'usd')).toBe(1234);
    });

    it('preserves the legacy behaviour of scaling only USD', () => {
      expect(toMinorUnits(10, 'JPY')).toBe(10);
      expect(toMinorUnits(10, 'EUR')).toBe(10);
    });

    it('defaults to USD', () => {
      expect(toMinorUnits(5, undefined)).toBe(500);
    });

    it('returns NaN for non-numeric amounts (legacy behaviour)', () => {
      expect(Number.isNaN(toMinorUnits('nonsense', 'USD'))).toBe(true);
    });
  });

  describe('fromMinorUnits', () => {
    it('halves cents for two-decimal currencies', () => {
      expect(fromMinorUnits(1000, 'USD')).toBe(10);
      expect(fromMinorUnits(1000, 'EUR')).toBe(10);
    });

    it('does not scale zero-decimal currencies', () => {
      expect(fromMinorUnits(1000, 'JPY')).toBe(1000);
    });

    it('defaults to USD', () => {
      expect(fromMinorUnits(500, undefined)).toBe(5);
    });

    it('returns NaN for non-numeric amounts (legacy behaviour)', () => {
      expect(Number.isNaN(fromMinorUnits('nonsense', 'USD'))).toBe(true);
    });
  });
});
