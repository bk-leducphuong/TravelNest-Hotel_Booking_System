/**
 * Pure row generator for the `review_replies` table.
 *
 * `review_replies` has a UNIQUE index on `review_id`, so at most one reply per
 * review. The hotel detail page includes it (`hotel.repository.js`, `as: 'reply'`)
 * and the admin review list filters on it (`hasReply` -> `EXISTS/NOT EXISTS`),
 * both of which are dead without rows.
 *
 * A reply must come from someone with the hotel `owner` role, so replies reuse
 * the seeded owner accounts (one per role) rather than random users — otherwise
 * the UI would attribute replies to guests.
 */

const { uuidv7 } = require('uuidv7');

const TABLE = 'review_replies';

const COLUMNS = ['id', 'review_id', 'user_id', 'reply_text', 'created_at', 'updated_at'];

const REPLIES = [
  'Thank you for taking the time to share your feedback. We are glad you enjoyed your stay and look forward to welcoming you back.',
  'We appreciate your review. Our team has noted your comments and will follow up on the points you raised.',
  'Thank you! It was a pleasure hosting you. We hope to see you again on your next trip.',
  'We are sorry your stay fell short of expectations. We have spoken with the team and made improvements since your visit.',
  'Thank you for the kind words about our location and service. We look forward to your next stay with us.',
  'Thanks for your feedback — we have shared it with our front desk team and will act on the actionable items.',
];

/** Fraction of reviews that get an owner reply. */
const REPLY_RATIO = 0.35;

/**
 * @param {*} faker
 * @param {Object} review row from `reviews`
 * @param {string} userId - owner account id
 */
function buildRow(faker, review, userId) {
  const createdAt = faker.date.between({
    from: review.created_at,
    to: review.updated_at || new Date(),
  });

  return {
    id: uuidv7(),
    review_id: review.id,
    user_id: userId,
    reply_text: faker.helpers.arrayElement(REPLIES),
    created_at: createdAt,
    updated_at: createdAt,
  };
}

async function* createRows({ faker, reviews, ownerIds, replyRatio = REPLY_RATIO }) {
  for await (const review of reviews) {
    if (faker.number.float() >= replyRatio) {
      continue;
    }
    yield buildRow(faker, review, faker.helpers.arrayElement(ownerIds));
  }
}

module.exports = {
  COLUMNS,
  REPLIES,
  REPLY_RATIO,
  TABLE,
  buildRow,
  createRows,
};
