const {
  toDateOnly,
  toDateObject,
  enumerateDateObjects,
  enumerateDateStrings,
} = require('@modules/inventory/infrastructure/room_inventory/dates');

describe('repositories/room_inventory/dates', () => {
  it('normalizes strings and Dates to YYYY-MM-DD', () => {
    expect(toDateOnly('2030-01-02')).toBe('2030-01-02');
    expect(toDateOnly(new Date('2030-01-02T05:00:00Z'))).toBe('2030-01-02');
  });

  it('parses a string into a Date', () => {
    expect(toDateObject('2030-01-02')).toBeInstanceOf(Date);
    const date = new Date('2030-01-02');
    expect(toDateObject(date)).toBe(date);
  });

  it('enumerates the range with an exclusive end date', () => {
    expect(enumerateDateObjects('2030-01-01', '2030-01-03')).toHaveLength(2);
    expect(enumerateDateStrings('2030-01-01', '2030-01-03')).toEqual(['2030-01-01', '2030-01-02']);
  });

  it('returns an empty range when start is not before end', () => {
    expect(enumerateDateStrings('2030-01-03', '2030-01-01')).toEqual([]);
  });
});
