const { normalizeList } = require('@modules/search/domain/filters');

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
});
