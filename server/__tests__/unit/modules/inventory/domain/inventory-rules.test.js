const {
  INVENTORY_STATUS,
  normalizeStatus,
  normalizeCurrency,
  toDateOnly,
  enumerateDates,
  resolveDateRange,
  MAX_RANGE_DAYS,
} = require('@modules/inventory/domain/inventory-rules');

describe('inventory rules', () => {
  describe('normalizeStatus', () => {
    it('accepts model statuses and the closed alias', () => {
      expect(normalizeStatus('open')).toBe(INVENTORY_STATUS.OPEN);
      expect(normalizeStatus('sold_out')).toBe(INVENTORY_STATUS.SOLD_OUT);
      expect(normalizeStatus('CLOSED')).toBe(INVENTORY_STATUS.CLOSE);
      expect(normalizeStatus(undefined)).toBeUndefined();
    });

    it('rejects unknown statuses', () => {
      expect(() => normalizeStatus('nonsense')).toThrow(
        expect.objectContaining({ statusCode: 400, code: 'INVALID_INVENTORY_STATUS' })
      );
    });
  });

  describe('normalizeCurrency', () => {
    it('uppercases and accepts allowed currencies', () => {
      expect(normalizeCurrency('usd')).toBe('USD');
      expect(normalizeCurrency(undefined)).toBeUndefined();
    });

    it('rejects unsupported currencies', () => {
      expect(() => normalizeCurrency('XYZ')).toThrow(
        expect.objectContaining({ statusCode: 400, code: 'INVALID_CURRENCY' })
      );
    });
  });

  describe('toDateOnly', () => {
    it('normalizes to YYYY-MM-DD', () => {
      expect(toDateOnly('2026-03-15T10:00:00.000Z')).toBe('2026-03-15');
      expect(toDateOnly(new Date('2026-03-15T23:00:00.000Z'))).toBe('2026-03-15');
    });

    it('rejects invalid/missing dates', () => {
      expect(() => toDateOnly('not-a-date')).toThrow(
        expect.objectContaining({ code: 'INVALID_DATE' })
      );
      expect(() => toDateOnly(undefined)).toThrow(
        expect.objectContaining({ code: 'INVALID_DATE' })
      );
    });
  });

  describe('enumerateDates', () => {
    it('returns an inclusive range', () => {
      expect(enumerateDates('2026-03-15', '2026-03-18')).toEqual([
        '2026-03-15',
        '2026-03-16',
        '2026-03-17',
        '2026-03-18',
      ]);
    });

    it('returns a single date when start equals end', () => {
      expect(enumerateDates('2026-03-15', '2026-03-15')).toEqual(['2026-03-15']);
    });

    it('rejects inverted and oversized ranges', () => {
      expect(() => enumerateDates('2026-03-18', '2026-03-15')).toThrow(
        expect.objectContaining({ code: 'INVALID_DATE_RANGE' })
      );

      const farFuture = new Date(Date.now() + (MAX_RANGE_DAYS + 10) * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      expect(() => enumerateDates('2026-01-01', farFuture)).toThrow(
        expect.objectContaining({ code: 'DATE_RANGE_TOO_LARGE' })
      );
    });
  });

  describe('resolveDateRange', () => {
    it('defaults to today plus 30 days', () => {
      const range = resolveDateRange();
      const expectedStart = new Date().toISOString().slice(0, 10);

      expect(range.startDate).toBe(expectedStart);
      expect(range.endDate > range.startDate).toBe(true);
    });

    it('keeps an explicit valid range and rejects an inverted one', () => {
      expect(resolveDateRange({ startDate: '2026-03-01', endDate: '2026-03-10' })).toEqual({
        startDate: '2026-03-01',
        endDate: '2026-03-10',
      });

      expect(() => resolveDateRange({ startDate: '2026-03-10', endDate: '2026-03-01' })).toThrow(
        expect.objectContaining({ code: 'INVALID_DATE_RANGE' })
      );
    });
  });
});
