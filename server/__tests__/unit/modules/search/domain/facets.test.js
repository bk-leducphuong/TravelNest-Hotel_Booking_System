const { buildFilterOptions } = require('@modules/search/domain/facets');

describe('search/domain/facets', () => {
  it('computes budget, amenities, class and review-score counts', () => {
    const result = buildFilterOptions([
      {
        min_price_per_night: '100',
        has_free_cancellation: true,
        hotel_class: 4,
        avg_rating: '4.6',
        amenity_codes: ['wifi'],
      },
      {
        min_price_per_night: '300',
        hotel_class: 4,
        avg_rating: '3.2',
        amenity_codes: ['wifi', 'pool'],
      },
    ]);

    expect(result.budget).toEqual({ min: 100, max: 300 });
    expect(result.amenities).toEqual({ wifi: 2, pool: 1 });
    expect(result.hotelClass).toEqual({ 4: 2 });
    expect(result.reviewScores).toEqual({ 4.5: 1, 4: 1, 3.5: 1, 3: 2 });
    expect(result.popular).toEqual({ freeCancellation: 1 });
  });

  it('returns empty facets for an empty result set', () => {
    const result = buildFilterOptions([]);

    expect(result.budget).toEqual({ min: null, max: null });
    expect(result.reviewScores).toEqual({ 4.5: 0, 4: 0, 3.5: 0, 3: 0 });
    expect(result.popular).toEqual({ freeCancellation: 0 });
  });
});
