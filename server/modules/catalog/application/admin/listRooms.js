const ApiError = require('@utils/ApiError');

const hotelRepository = require('../../infrastructure/hotel.repository');
const roomRepository = require('../../infrastructure/room-admin.repository');

/**
 * Rooms for a hotel (back-office). Includes inactive rooms so the owner can see
 * soft-deleted ones; the UI surfaces `status`.
 */
async function listRooms(hotelId) {
  const hotel = await hotelRepository.findByIdForAdmin(hotelId);

  if (!hotel) {
    throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
  }

  const rooms = await roomRepository.findByHotelId(hotelId);
  return { rooms };
}

module.exports = { listRooms };
