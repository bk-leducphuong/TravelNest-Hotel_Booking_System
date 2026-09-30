const ApiError = require('@utils/ApiError');
const hotelRepository = require('@repositories/hotel.repository');

const { formatNearbyPlaces } = require('./formatters');

/**
 * Get nearby places for a hotel.
 *
 * @param {string} hotelId
 * @param {{ category?: string, limit?: number }} options
 * @returns {Promise<Array<object>>}
 */
async function getNearbyPlaces(hotelId, options = {}) {
  const hotel = await hotelRepository.findById(hotelId);
  if (!hotel) {
    throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
  }

  const places = await hotelRepository.findNearbyPlacesByHotelId(hotelId, options);

  return formatNearbyPlaces(places);
}

module.exports = { getNearbyPlaces };
