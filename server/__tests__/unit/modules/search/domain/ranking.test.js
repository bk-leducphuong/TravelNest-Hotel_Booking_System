const { calculateSmartScore, rankAndSort } = require('@modules/search/domain/ranking');

describe('search/domain/ranking', () => {
  it('combines rating, popularity and review volume into a score', () => {
    expect(calculateSmartScore({ avg_rating: 5, total_bookings: 100, review_count: 50 })).toBe(120);
  });

  it('treats missing fields as zero', () => {
    expect(calculateSmartScore({})).toBe(0);
  });

  it('sorts by price ascending and descending', () => {
    const hotels = [{ min_price_for_dates: 200 }, { min_price_for_dates: 100 }];
    expect(rankAndSort(hotels, 'price_asc').map((h) => h.min_price_for_dates)).toEqual([100, 200]);
    expect(rankAndSort(hotels, 'price_desc').map((h) => h.min_price_for_dates)).toEqual([200, 100]);
  });

  it('sorts by rating and breaks ties on review count', () => {
    const hotels = [
      { avg_rating: 9, review_count: 10 },
      { avg_rating: 9, review_count: 50 },
      { avg_rating: 8, review_count: 1 },
    ];

    expect(rankAndSort(hotels, 'rating').map((h) => h.review_count)).toEqual([50, 10, 1]);
  });

  it('sorts by distance with unknown distance last', () => {
    const hotels = [{ distance_km: 5 }, {}, { distance_km: 1 }];
    expect(rankAndSort(hotels, 'distance').map((h) => h.distance_km)).toEqual([1, 5, undefined]);
  });

  it('sorts by popularity', () => {
    const hotels = [{ total_bookings: 2 }, { total_bookings: 9 }];
    expect(rankAndSort(hotels, 'popularity').map((h) => h.total_bookings)).toEqual([9, 2]);
  });

  it('defaults to smart ranking', () => {
    const hotels = [
      { avg_rating: 5, total_bookings: 0, review_count: 0 },
      { avg_rating: 9, total_bookings: 0, review_count: 0 },
    ];
    expect(rankAndSort(hotels, undefined)[0].avg_rating).toBe(9);
  });
});
