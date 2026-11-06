const { enrichHotelCardsByIds } = require('./hotel-cards');

/**
 * Get enriched hotel cards from a list of hotel IDs.
 */
async function getHotelsByIds(hotelIds, userId = null) {
  return enrichHotelCardsByIds(hotelIds, userId);
}

module.exports = { getHotelsByIds };
