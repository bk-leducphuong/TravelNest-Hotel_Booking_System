/**
 * Pure row generator for the `saved_hotels` table (wishlist).
 *
 * Read by `repositories/user.repository.js` (`findFavoriteHotelsByUserId`,
 * `findFavoriteHotelIds`) and drives the wishlist page plus the heart icon state
 * in search results, so an empty table makes every hotel look unsaved.
 *
 * `saved_hotels.id` is an auto-increment INT (not a UUID), so rows omit it and
 * the sampler tracks how many were emitted to produce `affectedRows`.
 */

const TABLE = 'saved_hotels';

const COLUMNS = ['user_id', 'hotel_id', 'saved_at'];

/** Wishlist depth per user. */
const DEFAULT_SAVED_PER_USER = { min: 2, max: 18 };

async function* createRows({ faker, userIds, hotelSampler, savedPerUser }) {
  const min = savedPerUser?.min ?? DEFAULT_SAVED_PER_USER.min;
  const max = savedPerUser?.max ?? DEFAULT_SAVED_PER_USER.max;

  for await (const userId of userIds) {
    const count = Math.min(faker.number.int({ min, max }), hotelSampler.size);
    if (count <= 0) {
      continue;
    }

    // Dedupe per user: (user_id, hotel_id) must be unique.
    const chosen = new Set();
    let guard = 0;
    while (chosen.size < count && guard < count * 10) {
      chosen.add(hotelSampler.random());
      guard += 1;
    }

    for (const hotelId of chosen) {
      yield {
        user_id: userId,
        hotel_id: hotelId,
        saved_at: faker.date.past({ years: 1 }),
      };
    }
  }
}

module.exports = {
  COLUMNS,
  DEFAULT_SAVED_PER_USER,
  TABLE,
  createRows,
};
