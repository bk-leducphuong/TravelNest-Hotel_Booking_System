const { buildFilterOptions } = require('@modules/search/domain/facets');

describe('search/domain/facets', () => {
  it('computes budget, amenities, class and review-score counts', () => {
    const result = buildFilterOptions([
      {
        min_price_per_night: '100',
        has_free_cancellation: true,
        hotel_class: 4,
        avg_rating: '9.2',
        amenity_codes: ['wifi'],
      },
      {
        min_price_per_night: '300',
        hotel_class: 4,
        avg_rating: '7.4',
        amenity_codes: ['wifi', 'pool'],
      },
    ]);

    expect(result.budget).toEqual({ min: 100, max: 300 });
    expect(result.amenities).toEqual({ wifi: 2, pool: 1 });
    expect(result.hotelClass).toEqual({ 4: 2 });
    expect(result.reviewScores).toEqual({ 9: 1, 8: 1, 7: 2, 6: 2 });
    expect(result.popular).toEqual({ freeCancellation: 1 });
  });

  it('returns empty facets for an empty result set', () => {
    const result = buildFilterOptions([]);

    expect(result.budget).toEqual({ min: null, max: null });
    expect(result.reviewScores).toEqual({ 9: 0, 8: 0, 7: 0, 6: 0 });
    expect(result.popular).toEqual({ freeCancellation: 0 });
  });
});
