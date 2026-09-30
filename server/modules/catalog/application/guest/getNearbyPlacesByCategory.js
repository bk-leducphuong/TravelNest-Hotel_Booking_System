const ApiError = require('@utils/ApiError');
const hotelRepository = require('@repositories/hotel.repository');

/**
 * Get nearby places grouped by category with distance statistics.
 *
 * @param {string} hotelId
 * @returns {Promise<Array<object>>}
 */
async function getNearbyPlacesByCategory(hotelId) {
  const hotel = await hotelRepository.findById(hotelId);
  if (!hotel) {
    throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
  }

  const groupedPlaces = await hotelRepository.findNearbyPlacesGroupedByCategory(hotelId);

  return groupedPlaces.map((group) => ({
    category: group.category,
    placeCount: parseInt(group.place_count, 10),
    minDistance: parseFloat(group.min_distance),
    avgDistance: parseFloat(group.avg_distance),
  }));
}

module.exports = { getNearbyPlacesByCategory };
