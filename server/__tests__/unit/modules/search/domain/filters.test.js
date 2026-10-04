const { normalizeList, applyDateSpecificFilters } = require('@modules/search/domain/filters');

describe('search/domain/filters', () => {
  describe('normalizeList', () => {
    it('passes arrays through', () => {
      expect(normalizeList(['wifi'])).toEqual(['wifi']);
    });

    it('parses JSON string arrays', () => {
      expect(normalizeList('["wifi","pool"]')).toEqual(['wifi', 'pool']);
    });

    it('returns [] for invalid or falsy input', () => {
      expect(normalizeList('not-json')).toEqual([]);
      expect(normalizeList(null)).toEqual([]);
      expect(normalizeList('{"a":1}')).toEqual([]);
    });
  });

  describe('applyDateSpecificFilters', () => {
    const hotels = [
      { id: 'a', min_price_per_night: 100 },
      { id: 'b', min_price_per_night: 300 },
      { id: 'c', available_rooms: [{ price_per_night: '200' }] },
      { id: 'd' },
    ];

    it('returns the input unchanged when no price filter is set', () => {
      expect(applyDateSpecificFilters(hotels, {})).toBe(hotels);
    });

    it('applies a max price filter', () => {
      expect(applyDateSpecificFilters(hotels, { maxPrice: 150 }).map((h) => h.id)).toEqual(['a']);
    });

    it('applies a min price filter, falling back to room price', () => {
      expect(applyDateSpecificFilters(hotels, { minPrice: 150 }).map((h) => h.id)).toEqual([
        'b',
        'c',
      ]);
    });

    it('excludes hotels without a usable price when filtering', () => {
      expect(applyDateSpecificFilters(hotels, { minPrice: 0 }).map((h) => h.id)).toEqual([
        'a',
        'b',
        'c',
      ]);
    });
  });
});
