const { toDateOnly, countNights } = require('@modules/search/domain/stay');

describe('search/domain/stay', () => {
  it('keeps date-only strings as-is (property-local semantics)', () => {
    expect(toDateOnly('2026-11-05')).toBe('2026-11-05');
    expect(toDateOnly(' 2026-11-05 ')).toBe('2026-11-05');
  });

  it('normalizes Date objects and full ISO timestamps', () => {
    expect(toDateOnly(new Date('2026-11-05T00:00:00Z'))).toBe('2026-11-05');
    expect(toDateOnly('2026-11-05T13:00:00Z')).toBe('2026-11-05');
  });

  it('returns null for invalid input', () => {
    expect(toDateOnly(null)).toBeNull();
    expect(toDateOnly('')).toBeNull();
    expect(toDateOnly('not-a-date')).toBeNull();
  });

  it('counts whole nights', () => {
    expect(countNights('2026-11-05', '2026-11-07')).toBe(2);
    expect(countNights('2026-12-31', '2027-01-02')).toBe(2);
  });

  it('returns 0 for empty or inverted ranges', () => {
    expect(countNights('2026-11-05', '2026-11-05')).toBe(0);
    expect(countNights('2026-11-07', '2026-11-05')).toBe(0);
    expect(countNights(null, '2026-11-05')).toBe(0);
  });
});
