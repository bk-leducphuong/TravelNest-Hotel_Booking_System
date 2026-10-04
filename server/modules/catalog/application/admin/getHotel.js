const ApiError = require('@utils/ApiError');

const hotelRepository = require('../../infrastructure/hotel.repository');
const roomRepository = require('../../infrastructure/room-admin.repository');

/**
 * Hotel detail for the property editor: the hotel plus its rooms and active
 * policies.
 */
async function getHotel(hotelId) {
  const hotel = await hotelRepository.findByIdForAdmin(hotelId);

  if (!hotel) {
    throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
  }

  const [rooms, policies] = await Promise.all([
    roomRepository.findByHotelId(hotelId),
    hotelRepository.findPoliciesByHotelId(hotelId),
  ]);

  return { hotel, rooms, policies };
}

module.exports = { getHotel };
