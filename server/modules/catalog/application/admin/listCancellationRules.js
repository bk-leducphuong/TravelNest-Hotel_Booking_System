const ApiError = require('@utils/ApiError');

const hotelRepository = require('../../infrastructure/hotel.repository');

/** Cancellation rules for a hotel (hotel-wide default + per-room overrides). */
async function listCancellationRules(hotelId) {
  const hotel = await hotelRepository.findByIdForAdmin(hotelId);

  if (!hotel) {
    throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
  }

  const rules = await hotelRepository.findCancellationRulesForAdmin(hotelId);
  return { rules };
}

module.exports = { listCancellationRules };
