jest.mock('@config/elasticsearch.config', () => ({
  search: jest.fn(),
  ping: jest.fn(),
}));
jest.mock('@config/logger.config', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

const elasticsearchHelper = require('@modules/search/infrastructure/elasticsearch.helper');

describe('elasticsearchHelper.buildSearchQuery', () => {
  it('uses a city_id term when a city was resolved', () => {
    const query = elasticsearchHelper.buildSearchQuery({ cityId: 'c-hn', city: 'Ha Noi' });

    expect(query.query.bool.filter).toContainEqual({ term: { city_id: 'c-hn' } });
    expect(query.query.bool.must).toHaveLength(0);
  });

  it('adds a normalized city, compact city and hotel-name should clause for free text', () => {
    const query = elasticsearchHelper.buildSearchQuery({ city: 'Hanoi' });

    const cityClause = query.query.bool.must[0];
    const fields = cityClause.bool.should.map((clause) => Object.keys(clause.match)[0]);

    expect(cityClause.bool.minimum_should_match).toBe(1);
    expect(fields).toEqual(['city', 'city_compact', 'hotel_name']);
    expect(cityClause.bool.should[0].match.city.query).toBe('hanoi');
    expect(cityClause.bool.should[1].match.city_compact.query).toBe('hanoi');
  });

  it('normalizes the city query so "Hà Nội" matches "Ha Noi"', () => {
    const query = elasticsearchHelper.buildSearchQuery({ city: 'Hà Nội' });

    expect(query.query.bool.must[0].bool.should[0].match.city.query).toBe('ha noi');
    expect(query.query.bool.must[0].bool.should[1].match.city_compact.query).toBe('hanoi');
  });

  it('still applies filters and pagination alongside the city clause', () => {
    const query = elasticsearchHelper.buildSearchQuery({
      city: 'Hanoi',
      minRating: 4,
      size: 50,
    });

    expect(query.query.bool.filter).toContainEqual({ range: { avg_rating: { gte: 4 } } });
    expect(query.size).toBe(50);
  });
});
