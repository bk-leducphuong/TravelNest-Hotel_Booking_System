const {
  assertNonEmptyArray,
  resolveStayDates,
  toDateOnlyString,
} = require('@modules/inventory/application/guest/input');

describe('inventory/application/guest/input', () => {
  describe('assertNonEmptyArray', () => {
    it.each([
      [null, 'bookedRooms', 'INVALID_BOOKED_ROOMS'],
      [[], 'roomIds', 'INVALID_ROOM_IDS'],
      [undefined, 'rooms', 'INVALID_ROOMS'],
      ['nope', 'rooms', 'INVALID_ROOMS'],
    ])('rejects %p for %s', (value, field, code) => {
      expect(() => assertNonEmptyArray(value, field)).toThrow(
        expect.objectContaining({ statusCode: 400, code })
      );
    });

    it('accepts a non-empty array', () => {
      expect(() => assertNonEmptyArray(['a'], 'roomIds')).not.toThrow();
    });
  });

  describe('resolveStayDates', () => {
    it('requires both dates', () => {
      expect(() => resolveStayDates('2999-01-01', undefined)).toThrow(
        expect.objectContaining({ statusCode: 400, code: 'MISSING_DATES' })
      );
    });

    it('rejects a check-out that is not after check-in', () => {
      expect(() => resolveStayDates('2999-01-03', '2999-01-01')).toThrow(
        expect.objectContaining({ statusCode: 400, code: 'INVALID_DATE_RANGE' })
      );
    });

    it('returns Date objects for a valid range', () => {
      const { start, end } = resolveStayDates('2999-01-01', '2999-01-03');
      expect(start).toBeInstanceOf(Date);
      expect(end).toBeInstanceOf(Date);
      expect(start < end).toBe(true);
    });
  });

  it('formats a date as YYYY-MM-DD', () => {
    expect(toDateOnlyString(new Date('2999-01-02T05:00:00Z'))).toBe('2999-01-02');
  });
});
