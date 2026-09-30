const { enrichHotelCardsByIds } = require('./hotel-cards');

/**
 * Get enriched hotel cards from a list of hotel IDs.
 */
async function getHotelsByIds(hotelIds) {
  return enrichHotelCardsByIds(hotelIds);
}

module.exports = { getHotelsByIds };
