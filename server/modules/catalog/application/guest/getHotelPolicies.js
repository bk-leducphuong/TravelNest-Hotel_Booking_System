const ApiError = require('@utils/ApiError');
const hotelRepository = require('../../infrastructure/hotel.repository');

const { formatPolicies } = require('./formatters');

/**
 * Get all policies for a hotel.
 *
 * @param {string} hotelId
 * @returns {Promise<Array<object>>}
 */
async function getHotelPolicies(hotelId) {
  const hotel = await hotelRepository.findById(hotelId);
  if (!hotel) {
    throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
  }

  const policies = await hotelRepository.findPoliciesByHotelId(hotelId);

  return formatPolicies(policies);
}

module.exports = { getHotelPolicies };
