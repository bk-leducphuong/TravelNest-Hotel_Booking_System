const {
  Reviews,
  Users,
  HotelRatingSummaries,
  ReviewReplies,
  ReviewMedia,
} = require('@models/index.js');

/**
 * Hotel review queries.
 */

async function findRatingSummaryByHotelId(hotelId) {
  return await HotelRatingSummaries.findOne({
    where: { hotel_id: hotelId },
    attributes: [
      'overall_rating',
      'total_reviews',
      'rating_10',
      'rating_9',
      'rating_8',
      'rating_7',
      'rating_6',
      'rating_5',
      'rating_4',
      'rating_3',
      'rating_2',
      'rating_1',
      'last_review_date',
    ],
  });
}

async function findReviewsByHotelId(hotelId, options = {}) {
  const { limit = 10, offset = 0 } = options;

  const result = await Reviews.findAndCountAll({
    where: {
      hotel_id: hotelId,
      status: 'published',
    },
    attributes: [
      'id',
      'rating_overall',
      'rating_cleanliness',
      'rating_location',
      'rating_service',
      'rating_value',
      'title',
      'comment',
      'is_verified',
      'helpful_count',
      'status',
      'created_at',
    ],
    include: [
      {
        model: Users,
        as: 'user',
        attributes: ['id', 'first_name', 'country'],
      },
      {
        model: ReviewReplies,
        as: 'reply',
        attributes: ['reply_text', 'created_at'],
        required: false,
      },
      {
        model: ReviewMedia,
        as: 'media',
        attributes: ['id', 'media_type', 'url', 'thumbnail_url'],
        required: false,
      },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  return {
    rows: result.rows,
    count: result.count,
  };
}

async function findReviewCriteriasByHotelId(hotelId) {
  const sequelize = require('@config/database.config');

  const query = `
      SELECT
        AVG(rating_cleanliness) AS cleanliness,
        AVG(rating_location) AS location,
        AVG(rating_service) AS service,
        AVG(rating_value) AS value_for_money,
        AVG(rating_overall) AS overall
      FROM reviews
      WHERE hotel_id = ? AND status = 'published'
    `;

  const result = await sequelize.query(query, {
    replacements: [hotelId],
    type: sequelize.QueryTypes.SELECT,
  });

  return (
    result[0] || {
      cleanliness: null,
      location: null,
      service: null,
      value_for_money: null,
      overall: null,
    }
  );
}

module.exports = {
  findRatingSummaryByHotelId,
  findReviewsByHotelId,
  findReviewCriteriasByHotelId,
};
