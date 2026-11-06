const { Op, fn, col } = require('sequelize');

const { reviews: Reviews } = require('@platform/database');
const sequelize = require('@config/database.config');

const { PUBLIC_INCLUDE, toLimit, toOffset } = require('./review.query');

/**
 * Guest-facing read queries over published reviews.
 *
 * Split out of `review.repository` so the write/moderation repository stays
 * focused and neither file grows into a god object.
 */
class ReviewReadRepository {
  async findPublishedByHotel(
    hotelId,
    { page = 1, limit = 20, minRating, maxRating, months, country, hasMedia, q } = {}
  ) {
    const safeLimit = toLimit(limit);
    const where = { hotel_id: hotelId, status: 'published' };
    const andConditions = [];

    // Score band (ratings are stored on a 1-10 scale).
    if (minRating !== undefined || maxRating !== undefined) {
      where.rating_overall = {};
      if (minRating !== undefined) where.rating_overall[Op.gte] = minRating;
      if (maxRating !== undefined) where.rating_overall[Op.lt] = maxRating;
    }

    // Free-text search over the review title/body.
    if (q) {
      where[Op.or] = [{ title: { [Op.like]: `%${q}%` } }, { comment: { [Op.like]: `%${q}%` } }];
    }

    // Season filter, by the month the review was written.
    if (Array.isArray(months) && months.length > 0) {
      andConditions.push(
        sequelize.where(fn('MONTH', col('reviews.created_at')), { [Op.in]: months })
      );
    }

    // Reviews that have at least one photo.
    if (hasMedia === true) {
      andConditions.push(
        sequelize.literal('EXISTS (SELECT 1 FROM review_media rm WHERE rm.review_id = reviews.id)')
      );
    }

    // Reviewer nationality. Filtering through the associated user with a
    // correlated subquery keeps the pagination subquery valid (a join filtered
    // on `$user.country$` would break limit/offset with the hasMany media join).
    if (country) {
      andConditions.push(
        sequelize.literal(
          `EXISTS (SELECT 1 FROM users cu WHERE cu.id = reviews.user_id AND cu.country = ${sequelize.escape(
            country
          )})`
        )
      );
    }

    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
    }

    return await Reviews.findAndCountAll({
      where,
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
      include: PUBLIC_INCLUDE,
      order: [['created_at', 'DESC']],
      limit: safeLimit,
      offset: toOffset(page, safeLimit),
      distinct: true,
    });
  }

  /**
   * Distinct reviewer countries for a hotel's published reviews, used to build
   * the "nationality" filter options on the guest review panel.
   */
  async findCountryFacetsByHotel(hotelId) {
    const rows = await sequelize.query(
      `SELECT u.country AS country, COUNT(*) AS count
         FROM reviews r
         JOIN users u ON u.id = r.user_id
        WHERE r.hotel_id = :hotelId
          AND r.status = 'published'
          AND u.country IS NOT NULL
          AND u.country <> ''
        GROUP BY u.country
        ORDER BY count DESC, u.country ASC`,
      { replacements: { hotelId }, type: sequelize.QueryTypes.SELECT }
    );

    return rows.map((row) => ({
      country: row.country,
      count: parseInt(row.count, 10) || 0,
    }));
  }
}

module.exports = new ReviewReadRepository();
