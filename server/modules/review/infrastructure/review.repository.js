const { Op, fn, col } = require('sequelize');

const {
  reviews: Reviews,
  review_replies: ReviewReplies,
  hotels: Hotels,
  images: Images,
} = require('@platform/database');
const sequelize = require('@config/database.config');

const { MODERATION_INCLUDE, PUBLIC_INCLUDE, toLimit, toOffset } = require('./review.query');

/**
 * Review repository - the write/moderation side of the review tables: creating
 * reviews, the user and moderation queries, and admin replies.
 *
 * Public guest reads live in `review-read.repository`; helpful votes live in
 * `review-vote.repository`.
 */
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
