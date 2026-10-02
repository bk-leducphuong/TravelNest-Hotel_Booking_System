/**
 * Pure row generator for the `review_media` table.
 *
 * Guest photos attached to reviews, included by `hotel.repository.js`
 * (`as: 'media'`) on the hotel detail page.
 *
 * URLs point at objects already uploaded by the image seeder (one of the hotel's
 * own active images) rather than new uploads. This keeps the step free — the
 * image step is already the slowest part of the run at ~200s — while still
 * giving every media row a URL that actually resolves in MinIO.
 */

const { uuidv7 } = require('uuidv7');

const TABLE = 'review_media';

const COLUMNS = [
  'id',
  'review_id',
  'media_type',
  'url',
  'thumbnail_url',
  'display_order',
  'created_at',
];

const MEDIA_TYPES = ['image', 'video'];

/** Fraction of reviews that carry guest photos. */
const MEDIA_RATIO = 0.3;

const MAX_MEDIA_PER_REVIEW = 4;

/** Fraction of media entries that are video (URL still points at an image). */
const VIDEO_RATIO = 0.08;

/**
 * @param {*} faker
 * @param {Object} review row from `reviews` (must include `image_url`)
 * @param {number} order zero-based display order
 */
function buildRow(faker, review, order) {
  const isVideo = faker.number.float() < VIDEO_RATIO;

  return {
    id: uuidv7(),
    review_id: review.id,
    media_type: isVideo ? faker.helpers.arrayElement(MEDIA_TYPES) : 'image',
    url: review.image_url,
    thumbnail_url: review.image_url,
    display_order: order,
    created_at: review.created_at,
  };
}

async function* createRows({ faker, reviews, mediaRatio = MEDIA_RATIO }) {
  for await (const review of reviews) {
    if (faker.number.float() >= mediaRatio) {
      continue;
    }

    // `url` is NOT NULL, so a review whose hotel has no uploaded image gets no
    // media row rather than a broken placeholder.
    if (!review.image_url) {
      continue;
    }

    const count = faker.number.int({ min: 1, max: MAX_MEDIA_PER_REVIEW });
    for (let order = 0; order < count; order += 1) {
      yield buildRow(faker, review, order);
    }
  }
}

module.exports = {
  COLUMNS,
  MAX_MEDIA_PER_REVIEW,
  MEDIA_RATIO,
  MEDIA_TYPES,
  TABLE,
  VIDEO_RATIO,
  buildRow,
  createRows,
};
