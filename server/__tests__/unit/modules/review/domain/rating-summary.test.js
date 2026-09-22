const { bucketForRating, buildSummary } = require('@modules/review/domain/rating-summary');

describe('rating summary projection', () => {
  describe('bucketForRating', () => {
    it('maps rating values to the documented 1..10 buckets', () => {
      expect(bucketForRating(9.5)).toBe(10);
      expect(bucketForRating(9.49)).toBe(9);
      expect(bucketForRating(8.5)).toBe(9);
      expect(bucketForRating(8.49)).toBe(8);
      expect(bucketForRating(1.49)).toBe(1);
      expect(bucketForRating(1.5)).toBe(2);
    });

    it('clamps out-of-range and invalid values', () => {
      expect(bucketForRating(0)).toBe(1);
      expect(bucketForRating(42)).toBe(10);
      expect(bucketForRating('not-a-number')).toBe(1);
    });
  });

  describe('buildSummary', () => {
    it('returns a zeroed summary for no reviews', () => {
      const summary = buildSummary([]);

      expect(summary.total_reviews).toBe(0);
      expect(summary.overall_rating).toBe(0);
      expect(summary.total_rating_sum).toBe(0);
      expect(summary.last_review_date).toBeNull();
      for (let score = 1; score <= 10; score += 1) {
        expect(summary[`rating_${score}`]).toBe(0);
      }
    });

    it('computes average, distribution and last review date', () => {
      const rows = [
        { rating_overall: '9.0', created_at: new Date('2026-01-01T00:00:00Z') },
        { rating_overall: '9.4', created_at: new Date('2026-02-01T00:00:00Z') },
        { rating_overall: '8.4', created_at: new Date('2026-03-01T00:00:00Z') },
        { rating_overall: '2.0', created_at: new Date('2025-12-01T00:00:00Z') },
      ];

      const summary = buildSummary(rows);

      expect(summary.total_reviews).toBe(4);
      expect(summary.total_rating_sum).toBeCloseTo(28.8, 5);
      expect(summary.overall_rating).toBeCloseTo(7.2, 5);
      expect(summary.rating_9).toBe(2);
      expect(summary.rating_8).toBe(1);
      expect(summary.rating_2).toBe(1);
      expect(summary.last_review_date).toEqual(new Date('2026-03-01T00:00:00Z'));
    });

    it('ignores rows with an invalid rating', () => {
      const rows = [{ rating_overall: 'abc' }, { rating_overall: '10' }];
      const summary = buildSummary(rows);

      expect(summary.total_reviews).toBe(1);
      expect(summary.rating_10).toBe(1);
    });
  });
});
