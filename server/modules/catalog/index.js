const roomRepository = require('./infrastructure/room.repository');

/**
 * Catalog module - public interface.
 *
 * Other modules may only use what is exported here; never Catalog's models or
 * repositories directly.
 */

async function getRoomsForHotel(hotelId) {
  return await roomRepository.findByHotelId(hotelId);
}

async function getRoomById(roomId) {
  return await roomRepository.findById(roomId);
}

async function getRoomForHotel(roomId, hotelId) {
  return await roomRepository.findByIdAndHotelId(roomId, hotelId);
}

module.exports = {
  getRoomsForHotel,
  getRoomById,
  getRoomForHotel,
};
