const { Op } = require('sequelize');

const {
  reviews: Reviews,
  review_replies: ReviewReplies,
  review_media: ReviewMedia,
  users: Users,
  hotels: Hotels,
} = require('@models/index.js');
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

  async findPublishedByHotel(hotelId, { page = 1, limit = 20 } = {}) {
    const safeLimit = toLimit(limit);
    return await Reviews.findAndCountAll({
      where: { hotel_id: hotelId, status: 'published' },
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

  async findByUser(userId, { page = 1, limit = 20 } = {}) {
    const safeLimit = toLimit(limit);
    return await Reviews.findAndCountAll({
      where: { user_id: userId },
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
        { model: Hotels, as: 'hotel', attributes: ['id', 'name'], required: false },
        ...PUBLIC_INCLUDE,
      ],
      order: [['created_at', 'DESC']],
      limit: safeLimit,
      offset: toOffset(page, safeLimit),
      distinct: true,
    });
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
