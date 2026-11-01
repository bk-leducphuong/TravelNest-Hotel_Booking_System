const {
  RANKING_CONFIG,
  calculateAdjustedQuality,
  calculatePriorMean,
  calculatePopularityScore,
  calculateDistanceScore,
  rankAndSort,
} = require('@modules/search/domain/ranking');

const hotel = (overrides) => ({
  hotel_id: overrides.hotel_id || 'h',
  avg_rating: 8,
  review_count: 10,
  total_bookings: 0,
  ...overrides,
});

describe('search/domain/ranking', () => {
  describe('Bayesian rating shrinkage', () => {
    it('pulls a hotel with few reviews toward the prior mean', () => {
      const priorMean = 7;
      const few = calculateAdjustedQuality({ avg_rating: 10, review_count: 1 }, priorMean);
      const many = calculateAdjustedQuality({ avg_rating: 10, review_count: 10000 }, priorMean);

      expect(few).toBeLessThan(many);
      expect(few).toBeGreaterThan(priorMean);
      expect(many).toBeCloseTo(10, 1);
    });

    it('treats a hotel with no reviews as the prior mean', () => {
      expect(calculateAdjustedQuality({ avg_rating: 0, review_count: 0 }, 7)).toBe(7);
    });

    it('uses a constant prior when no hotel has a rating', () => {
      expect(calculatePriorMean([{ avg_rating: 0 }, { avg_rating: null }])).toBe(
        RANKING_CONFIG.priorMeanFallback
      );
    });

    it('computes the prior mean over rated hotels only', () => {
      expect(calculatePriorMean([{ avg_rating: 8 }, { avg_rating: 10 }, { avg_rating: 0 }])).toBe(
        9
      );
    });
  });

  describe('features', () => {
    it('applies diminishing returns to popularity', () => {
      const low = calculatePopularityScore({ total_bookings: 10 }, 10000);
      const high = calculatePopularityScore({ total_bookings: 10000 }, 10000);

      expect(low).toBeGreaterThan(0);
      expect(high).toBe(1);
      // Log scaling compresses a 1000x booking gap into a small score ratio.
      expect(high / low).toBeLessThan(100);
    });

    it('treats zero distance as the best score, not missing', () => {
      expect(calculateDistanceScore({ distance_km: 0 }, 10)).toBe(1);
      expect(calculateDistanceScore({ distance_km: 10 }, 10)).toBe(0);
      expect(calculateDistanceScore({}, 10)).toBeNull();
    });
  });

  describe('rankAndSort', () => {
    it('ranks by the documented feature mix and exposes its components', () => {
      const sorted = rankAndSort(
        [
          hotel({ hotel_id: 'thin', avg_rating: 10, review_count: 1, total_bookings: 0 }),
          hotel({ hotel_id: 'proven', avg_rating: 9, review_count: 500, total_bookings: 50 }),
        ],
        'relevance'
      );

      expect(sorted).toHaveLength(2);
      sorted.forEach((entry) => {
        expect(entry.relevance.quality).toBeGreaterThan(0);
        expect(entry.relevance.popularity).toBeGreaterThanOrEqual(0);
      });
      expect(sorted[0]).toHaveProperty('relevance.score');
    });

    it('boosts hotel-name intent tiers in relevance order', () => {
      const sorted = rankAndSort(
        [
          hotel({
            hotel_id: 'generic',
            avg_rating: 9.5,
            review_count: 400,
            total_bookings: 100,
            name_match_tier: 0,
          }),
          hotel({
            hotel_id: 'exact',
            avg_rating: 7,
            review_count: 5,
            total_bookings: 0,
            name_match_tier: 4,
          }),
        ],
        'relevance',
        { nameIntent: true }
      );

      expect(sorted[0].hotel_id).toBe('exact');
    });

    it('sorts price ascending/descending with nulls last', () => {
      const hotels = [
        hotel({ hotel_id: 'a', min_price_for_dates: 200 }),
        hotel({ hotel_id: 'b', min_price_for_dates: null }),
        hotel({ hotel_id: 'c', min_price_for_dates: 100 }),
      ];

      expect(rankAndSort(hotels, 'price_asc').map((h) => h.hotel_id)).toEqual(['c', 'a', 'b']);
      expect(rankAndSort(hotels, 'price_desc').map((h) => h.hotel_id)).toEqual(['a', 'c', 'b']);
    });

    it('sorts by raw rating with review-count then hotel-id tie-breaks', () => {
      const hotels = [
        hotel({ hotel_id: 'a', avg_rating: 9, review_count: 10 }),
        hotel({ hotel_id: 'c', avg_rating: 9, review_count: 50 }),
        hotel({ hotel_id: 'b', avg_rating: 9, review_count: 50 }),
        hotel({ hotel_id: 'd', avg_rating: 8, review_count: 1 }),
      ];

      expect(rankAndSort(hotels, 'rating').map((h) => h.hotel_id)).toEqual(['b', 'c', 'a', 'd']);
    });

    it('sorts by distance only when an anchor exists', () => {
      const hotels = [
        hotel({ hotel_id: 'a', distance_km: 5 }),
        hotel({ hotel_id: 'b' }),
        hotel({ hotel_id: 'c', distance_km: 1 }),
      ];

      expect(rankAndSort(hotels, 'distance').map((h) => h.hotel_id)).toEqual(['a', 'b', 'c']);
      expect(rankAndSort(hotels, 'distance', { hasAnchor: true }).map((h) => h.hotel_id)).toEqual([
        'c',
        'a',
        'b',
      ]);
    });

    it('sorts by popularity and hotel id as the final tie-break', () => {
      const hotels = [
        hotel({ hotel_id: 'b', total_bookings: 9 }),
        hotel({ hotel_id: 'a', total_bookings: 9 }),
      ];

      expect(rankAndSort(hotels, 'popularity').map((h) => h.hotel_id)).toEqual(['a', 'b']);
    });

    it('does not mutate the input array', () => {
      const hotels = [
        hotel({ hotel_id: 'a', min_price_for_dates: 200 }),
        hotel({ hotel_id: 'b', min_price_for_dates: 100 }),
      ];
      const copy = [...hotels];

      rankAndSort(hotels, 'price_asc');

      expect(hotels).toEqual(copy);
    });
  });
});
