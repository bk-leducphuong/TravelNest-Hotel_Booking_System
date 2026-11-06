const { Bookings } = require('@platform/database');
const bookingRepository = require('@modules/booking/infrastructure/booking.repository');

/**
 * SQL-shape regression tests for the review-state filters.
 *
 * These deliberately use the real Sequelize models and capture the generated
 * SQL instead of mocking the model methods: the production failure this guards
 * against was invisible to option-level mocks ("Unknown column 'reviews.id' in
 * 'where clause'") because Sequelize silently wrapped the select in a subquery
 * once `limit` met a hasMany include.
 */
describe('bookingRepository review-state SQL', () => {
  const originalQuery = Bookings.sequelize.query;
  let sql;

  beforeEach(() => {
    sql = '';
    Bookings.sequelize.query = async (query) => {
      sql = query;
      throw new Error('stop-after-sql');
    };
  });

  afterEach(() => {
    Bookings.sequelize.query = originalQuery;
  });

  it('keeps the reviewable filter in the same scope as its join', async () => {
    await expect(
      bookingRepository.findReviewableByBuyerId('buyer-1', { limit: 20, offset: 40 })
    ).rejects.toThrow('stop-after-sql');

    expect(sql).toContain('LEFT OUTER JOIN `reviews` AS `reviews`');
    expect(sql).toContain('`reviews`.`id` IS NULL');
    expect(sql).toMatch(/LIMIT 40,\s*20/);
    // A `FROM (SELECT ...)` wrapper puts the filter before the join.
    expect(sql).not.toMatch(/FROM\s*\(\s*SELECT/);
  });

  it('keeps the legacy reviewed filter in the same scope when paginated', async () => {
    await expect(
      bookingRepository.findByBuyerId('buyer-1', { reviewed: false, limit: 20, offset: 0 })
    ).rejects.toThrow('stop-after-sql');

    expect(sql).toContain('LEFT OUTER JOIN `reviews` AS `reviews`');
    expect(sql).toContain('`reviews`.`id` IS NULL');
    expect(sql).not.toMatch(/FROM\s*\(\s*SELECT/);
  });
});
