const { getClient } = require('@config/clickhouse.config');
const logger = require('@config/logger.config');

class HotelDailyViewsClickHouseRepository {
  constructor() {
    this.client = getClient();
    this.tableName = 'travelnest.hotel_daily_views';
  }

  /**
   * Get trending hotel ids by summing daily views in last N days.
   * @param {Object} params
   * @param {number} params.limit
   * @param {number} params.days
   * @returns {Promise<Array<{ hotel_id: string, views: number }>>}
   */
  async findTrendingHotelIds({ limit = 10, days = 2 } = {}) {
    const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const safeDays = Math.max(1, Math.min(365, parseInt(days, 10) || 2));

    try {
      const result = await this.client.query({
        query: `
          SELECT
            toString(hotel_id) AS hotel_id,
            sum(views) AS views
          FROM ${this.tableName}
          WHERE date >= today() - {days:UInt32}
          GROUP BY hotel_id
          ORDER BY views DESC
          LIMIT {limit:UInt32}
        `,
        query_params: {
          limit: safeLimit,
          days: safeDays - 1,
        },
        format: 'JSONEachRow',
      });

      const rows = await result.json();
      return rows.map((r) => ({
        hotel_id: r.hotel_id,
        views: parseInt(r.views, 10) || 0,
      }));
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack, limit: safeLimit, days: safeDays },
        'Failed to fetch trending hotels from ClickHouse'
      );
      throw error;
    }
  }
}

module.exports = new HotelDailyViewsClickHouseRepository();

