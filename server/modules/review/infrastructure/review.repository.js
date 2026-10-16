const { Op, fn, col } = require('sequelize');

const {
  reviews: Reviews,
  review_replies: ReviewReplies,
  review_media: ReviewMedia,
  review_helpful_votes: ReviewHelpfulVotes,
  users: Users,
  hotels: Hotels,
  images: Images,
} = require('@platform/database');
const sequelize = require('@config/database.config');

/**
 * Review repository - the only place that touches review tables.
 */

const PUBLIC_INCLUDE = [
  {
    model: Users,
    as: 'user',
    attributes: ['id', 'first_name', 'last_name', 'profile_picture_url', 'country'],
    required: false,
  },
  {
    model: ReviewReplies,
    as: 'reply',
    attributes: ['id', 'reply_text', 'created_at', 'updated_at'],
    required: false,
    include: [{ model: Users, as: 'user', attributes: ['id', 'first_name', 'last_name'] }],
  },
  {
    model: ReviewMedia,
    as: 'media',
    attributes: ['id', 'media_type', 'url', 'thumbnail_url', 'display_order'],
    required: false,
  },
];

const MODERATION_INCLUDE = [
  ...PUBLIC_INCLUDE,
  {
    model: Hotels,
    as: 'hotel',
    attributes: ['id', 'name', 'city_id'],
    required: false,
  },
];

function toLimit(limit, fallback = 20, max = 100) {
  const parsed = parseInt(limit, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function toOffset(page, limit) {
  const parsed = parseInt(page, 10);
  const safePage = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  return (safePage - 1) * limit;
}

class ReviewRepository {
  async create(data, options = {}) {
    return await Reviews.create(
      {
        user_id: data.userId,
        hotel_id: data.hotelId,
        booking_id: data.bookingId || null,
        rating_overall: data.ratings.overall,
        rating_cleanliness: data.ratings.cleanliness ?? null,
        rating_location: data.ratings.location ?? null,
        rating_service: data.ratings.service ?? null,
        rating_value: data.ratings.value ?? null,
        title: data.title || null,
        comment: data.comment || null,
        status: data.status || 'published',
        is_verified: data.isVerified || false,
      },
      options
    );
  }

  async findById(reviewId, options = {}) {
    return await Reviews.findOne({
      where: { id: reviewId },
      include: MODERATION_INCLUDE,
      ...options,
    });
  }

  async findByBookingId(bookingId, options = {}) {
    return await Reviews.findOne({
      where: { booking_id: bookingId },
      ...options,
    });
  }

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

  async findByUser(userId, { page = 1, limit = 20, status } = {}) {
    const safeLimit = toLimit(limit);
    // Default: everything the user authored except soft-deleted rows. `status`
    // narrows to a single moderation state (e.g. 'published' for the Reviewed tab).
    const statusFilter = status || { [Op.in]: ['published', 'hidden'] };
    return await Reviews.findAndCountAll({
      where: { user_id: userId, status: statusFilter },
      attributes: [
        'id',
        'hotel_id',
        'booking_id',
        'rating_overall',
        'title',
        'comment',
        'status',
        'is_verified',
        'helpful_count',
        'created_at',
        'updated_at',
      ],
      include: [
        {
          model: Hotels,
          as: 'hotel',
          attributes: ['id', 'name', 'city_id'],
          required: false,
          include: [
            {
              model: Images,
              as: 'images',
              where: { status: 'active' },
              attributes: ['id', 'object_key', 'is_primary', 'display_order'],
              required: false,
            },
          ],
        },
        ...PUBLIC_INCLUDE,
      ],
      order: [['created_at', 'DESC']],
      limit: safeLimit,
      offset: toOffset(page, safeLimit),
      distinct: true,
    });
  }

  /**
   * Per-status counts for a user's own reviews (excludes soft-deleted rows), so
   * the dashboard can show "All reviews" (published + hidden) vs "Reviewed"
   * (published) without loading every row.
   */
  async countByStatusForUser(userId) {
    const rows = await Reviews.findAll({
      where: {
        user_id: userId,
        status: { [Op.in]: ['published', 'hidden'] },
      },
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    });

    const counts = { published: 0, hidden: 0 };
    rows.forEach((row) => {
      if (Object.prototype.hasOwnProperty.call(counts, row.status)) {
        counts[row.status] = parseInt(row.count, 10) || 0;
      }
    });
    return counts;
  }

  async findByBookingIds(bookingIds = [], options = {}) {
    if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
      return [];
    }
    return await Reviews.findAll({
      where: { booking_id: { [Op.in]: bookingIds } },
      ...options,
    });
  }

  async findForModeration({
    status,
    hotelId,
    minRating,
    maxRating,
    hasReply,
    q,
    page = 1,
    limit = 20,
  } = {}) {
    const safeLimit = toLimit(limit);
    const where = {};

    if (status) {
      where.status = status;
    }
    if (hotelId) {
      where.hotel_id = hotelId;
    }
    if (minRating !== undefined || maxRating !== undefined) {
      where.rating_overall = {};
      if (minRating !== undefined) where.rating_overall[Op.gte] = minRating;
      if (maxRating !== undefined) where.rating_overall[Op.lte] = maxRating;
    }
    if (q) {
      where[Op.or] = [{ title: { [Op.like]: `%${q}%` } }, { comment: { [Op.like]: `%${q}%` } }];
    }

    const andConditions = [];
    if (hasReply === true) {
      andConditions.push(
        sequelize.literal(
          'EXISTS (SELECT 1 FROM review_replies rr WHERE rr.review_id = reviews.id)'
        )
      );
    } else if (hasReply === false) {
      andConditions.push(
        sequelize.literal(
          'NOT EXISTS (SELECT 1 FROM review_replies rr WHERE rr.review_id = reviews.id)'
        )
      );
    }
    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
    }

    return await Reviews.findAndCountAll({
      where,
      include: MODERATION_INCLUDE,
      order: [['created_at', 'DESC']],
      limit: safeLimit,
      offset: toOffset(page, safeLimit),
      distinct: true,
    });
  }

  /**
   * Light lookup used before casting a helpful vote: we only need to confirm
   * the review is published and to reject voting on your own review.
   */
  async findVoteTarget(reviewId) {
    return await Reviews.findOne({
      where: { id: reviewId },
      attributes: ['id', 'user_id', 'status'],
    });
  }

  /**
   * The current user's votes for a page of reviews, keyed by review id.
   */
  async findVotesByReviewIds(reviewIds = [], userId) {
    if (!userId || !Array.isArray(reviewIds) || reviewIds.length === 0) {
      return [];
    }

    return await ReviewHelpfulVotes.findAll({
      where: { review_id: { [Op.in]: reviewIds }, user_id: userId },
      attributes: ['review_id', 'is_helpful'],
      raw: true,
    });
  }

  /**
   * Create/update the user's vote and recompute the denormalised
   * `reviews.helpful_count` (the number of `is_helpful = true` votes).
   */
  async applyHelpfulVote({ reviewId, userId, isHelpful }) {
    return await sequelize.transaction(async (transaction) => {
      await ReviewHelpfulVotes.upsert(
        { review_id: reviewId, user_id: userId, is_helpful: isHelpful },
        { transaction }
      );

      const helpfulCount = await ReviewHelpfulVotes.count({
        where: { review_id: reviewId, is_helpful: true },
        transaction,
      });

      await Reviews.update(
        { helpful_count: helpfulCount },
        { where: { id: reviewId }, transaction }
      );

      return helpfulCount;
    });
  }

  /**
   * Remove the user's vote (if any) and recompute `reviews.helpful_count`.
   */
  async removeHelpfulVote({ reviewId, userId }) {
    return await sequelize.transaction(async (transaction) => {
      await ReviewHelpfulVotes.destroy({
        where: { review_id: reviewId, user_id: userId },
        transaction,
      });

      const helpfulCount = await ReviewHelpfulVotes.count({
        where: { review_id: reviewId, is_helpful: true },
        transaction,
      });

      await Reviews.update(
        { helpful_count: helpfulCount },
        { where: { id: reviewId }, transaction }
      );

      return helpfulCount;
    });
  }

  async updateStatus(reviewId, status, options = {}) {
    const [updated] = await Reviews.update({ status }, { where: { id: reviewId }, ...options });
    return updated;
  }

  async findPublishedRatingRows(hotelId, options = {}) {
    return await Reviews.findAll({
      where: { hotel_id: hotelId, status: 'published' },
      attributes: ['rating_overall', 'created_at'],
      raw: true,
      ...options,
    });
  }

  async findStatusAndRatingRows(hotelId, options = {}) {
    return await Reviews.findAll({
      where: { hotel_id: hotelId },
      attributes: ['id', 'status', 'rating_overall', 'created_at'],
      raw: true,
      ...options,
    });
  }

  async countRepliesForHotel(hotelId) {
    const rows = await ReviewReplies.findAll({
      attributes: ['review_id'],
      include: [
        {
          model: Reviews,
          as: 'review',
          attributes: [],
          where: { hotel_id: hotelId },
          required: true,
        },
      ],
      raw: true,
    });

    return new Set(rows.map((row) => row.review_id)).size;
  }

  async findReplyByReviewId(reviewId, options = {}) {
    return await ReviewReplies.findOne({
      where: { review_id: reviewId },
      ...options,
    });
  }

  async createReply({ reviewId, userId, replyText }, options = {}) {
    return await ReviewReplies.create(
      {
        review_id: reviewId,
        user_id: userId,
        reply_text: replyText,
      },
      options
    );
  }

  async updateReply(reviewId, replyText, options = {}) {
    const [updated] = await ReviewReplies.update(
      { reply_text: replyText },
      { where: { review_id: reviewId }, ...options }
    );
    return updated;
  }

  async deleteReply(reviewId, options = {}) {
    return await ReviewReplies.destroy({
      where: { review_id: reviewId },
      ...options,
    });
  }
}

module.exports = new ReviewRepository();
