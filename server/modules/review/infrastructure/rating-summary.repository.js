const { hotel_rating_summaries: HotelRatingSummaries } = require('@models/index.js');

/**
 * Rating summary repository - the projection table owned by the review module.
 */
class RatingSummaryRepository {
  async findByHotelId(hotelId, options = {}) {
    return await HotelRatingSummaries.findOne({
      where: { hotel_id: hotelId },
      ...options,
    });
  }

  async upsert(hotelId, summary, options = {}) {
    const existing = await HotelRatingSummaries.findOne({
      where: { hotel_id: hotelId },
      ...options,
    });

    if (existing) {
      await existing.update(summary, options);
      return existing;
    }

    return await HotelRatingSummaries.create({ hotel_id: hotelId, ...summary }, options);
  }
}

module.exports = new RatingSummaryRepository();
