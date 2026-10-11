const ApiError = require('@utils/ApiError');

const hotelRepository = require('../../infrastructure/hotel.repository');

/**
 * Hotel policies for the back-office (includes inactive rows).
 */
async function listPolicies(hotelId) {
  const hotel = await hotelRepository.findByIdForAdmin(hotelId);

  if (!hotel) {
    throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
  }

  const policies = await hotelRepository.findPoliciesForAdmin(hotelId);
  return { policies };
}

module.exports = { listPolicies };
