const ApiError = require('@utils/ApiError');

const hotelRepository = require('../../infrastructure/hotel.repository');
const roomRepository = require('../../infrastructure/room-admin.repository');

/** The amenity ids assigned to a room (scoped to the hotel). */
async function getRoomAmenities(hotelId, roomId) {
  const room = await roomRepository.findByIdAndHotelId(roomId, hotelId);

  if (!room) {
    throw new ApiError(404, 'ROOM_NOT_FOUND', 'Room not found');
  }

  const amenityIds = await hotelRepository.findRoomAmenityIds(roomId);
  return { hotelId, roomId, amenityIds };
}

module.exports = { getRoomAmenities };
