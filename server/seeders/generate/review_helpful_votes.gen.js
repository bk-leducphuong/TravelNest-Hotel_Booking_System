/**
 * Pure row generator for the `review_helpful_votes` table.
 *
 * The table itself is only read through model associations, but
 * `reviews.helpful_count` is denormalised from it — the reviews generator seeds
 * `helpful_count` as a random 0-50 with no backing votes, so the counter does
 * not correspond to anything. Seeding the votes makes the two agree.
 *
 * One vote per (review, user) — voters are sampled from the real user ids so
 * the foreign key always resolves.
 */

const { uuidv7 } = require('uuidv7');

const TABLE = 'review_helpful_votes';

const COLUMNS = ['id', 'review_id', 'user_id', 'is_helpful', 'created_at', 'updated_at'];

/** Fraction of reviewers who mark a review helpful (mirrors the sort order). */
const HELPFUL_RATIO = 0.72;

/**
 * @param {*} faker
 * @param {Object} review row from `reviews`
 * @param {string[]} userIds - distinct users, larger than the vote count
 * @param {number} count - how many votes to emit
 */
function buildRows(faker, review, userIds, count) {
  const createdAt = faker.date.between({
    from: review.created_at,
    to: review.updated_at || new Date(),
  });

  const rows = [];
  for (let i = 0; i < count && i < userIds.length; i += 1) {
    rows.push({
      id: uuidv7(),
      review_id: review.id,
      user_id: userIds[i],
      is_helpful: faker.number.float() < HELPFUL_RATIO,
      created_at: createdAt,
      updated_at: createdAt,
    });
  }
  return rows;
}

async function* createRows({ faker, reviews, userSampler, maxVotesPerReview = 6 }) {
  for await (const review of reviews) {
    const count = faker.number.int({ min: 0, max: maxVotesPerReview });
    if (count === 0) {
      continue;
    }

    // Sample without replacement so a single review never gets duplicate voters.
    const userIds = new Set();
    let guard = 0;
    while (userIds.size < count && guard < count * 10) {
      userIds.add(userSampler.random());
      guard += 1;
    }

    for (const row of buildRows(faker, review, [...userIds], userIds.size)) {
      yield row;
    }
  }
}

module.exports = {
  COLUMNS,
  HELPFUL_RATIO,
  TABLE,
  buildRows,
  createRows,
};
