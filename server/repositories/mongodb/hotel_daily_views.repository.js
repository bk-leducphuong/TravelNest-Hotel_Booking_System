const logger = require('@config/logger.config');
const HotelViewEvent = require('@models/mongo/hotel_view_event.model');

const DAY_MS = 24 * 60 * 60 * 1000;

class HotelDailyViewsMongoRepository {
  async findTrendingHotelIds({ limit = 10, days = 2 } = {}) {
    const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const safeDays = Math.max(1, Math.min(365, parseInt(days, 10) || 2));
    const since = new Date(Date.now() - Math.max(0, safeDays - 1) * DAY_MS);
    since.setUTCHours(0, 0, 0, 0);

    try {
      const rows = await HotelViewEvent.aggregate([
        {
          $match: {
            viewedAt: { $gte: since },
          },
        },
        {
          $group: {
            _id: '$hotelId',
            views: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            hotel_id: '$_id',
            views: 1,
          },
        },
        { $sort: { views: -1 } },
        { $limit: safeLimit },
      ]);

      return rows.map((row) => ({
        hotel_id: row.hotel_id,
        views: parseInt(row.views, 10) || 0,
      }));
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack, limit: safeLimit, days: safeDays },
        'Failed to fetch trending hotels from MongoDB'
      );
      throw error;
    }
  }
}

module.exports = new HotelDailyViewsMongoRepository();
