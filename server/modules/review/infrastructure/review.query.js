const {
  review_replies: ReviewReplies,
  review_media: ReviewMedia,
  users: Users,
  hotels: Hotels,
} = require('@platform/database');

/**
 * Shared query building blocks for the review repositories
 * (`review.repository`, `review-read.repository`). Extracted so the includes
 * and pagination helpers have a single definition instead of drifting between
 * repositories.
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

module.exports = { PUBLIC_INCLUDE, MODERATION_INCLUDE, toLimit, toOffset };
