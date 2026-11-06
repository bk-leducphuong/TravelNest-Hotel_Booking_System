const { searchMapHotels } = require('@modules/search/api/guest.schema');
const {
  buildCandidateQuery,
} = require('@modules/search/infrastructure/queries/candidate-hotels.query');

const request = {
  north: 11,
  south: 10,
  east: 107,
  west: 106,
  checkIn: '2099-01-01',
  checkOut: '2099-01-03',
  adults: 2,
};

describe('map search contract', () => {
  it('accepts a bounded stay without a destination and preserves filters', () => {
    const { error, value } = searchMapHotels.query.validate({
      ...request,
      amenities: 'WIFI,POOL',
      hotelClass: '4,5',
      freeCancellation: true,
    });
    expect(error).toBeUndefined();
    expect(value).toMatchObject({ rooms: 1, children: 0, freeCancellation: true });
  });
  it.each([
    { north: 95 },
    { south: 12 },
    { east: 110 },
    { west: 107 },
    { checkOut: '2099-02-10' },
    { adults: 0 },
  ])('rejects invalid or excessive bounds/stays: %o', (patch) => {
    expect(searchMapHotels.query.validate({ ...request, ...patch }).error).toBeDefined();
  });
  it('accepts a small area across the antimeridian', () => {
    expect(
      searchMapHotels.query.validate({ ...request, west: 179.5, east: -179.5 }).error
    ).toBeUndefined();
  });
  it('binds viewport bounds and bounds candidate work before availability', () => {
    const query = buildCandidateQuery({ mapSearch: true, bounds: request });
    expect(query.sql).toContain('s.latitude BETWEEN :south AND :north');
    expect(query.sql).toContain('s.longitude BETWEEN :west AND :east');
    expect(query.sql).toContain('LIMIT 2001');
    expect(query.replacements).toMatchObject({ north: 11, south: 10, west: 106, east: 107 });
  });
  it('uses a wrapped longitude predicate across the antimeridian', () => {
    expect(
      buildCandidateQuery({ mapSearch: true, bounds: { ...request, west: 179.5, east: -179.5 } })
        .sql
    ).toContain('s.longitude >= :west OR s.longitude <= :east');
  });
});
