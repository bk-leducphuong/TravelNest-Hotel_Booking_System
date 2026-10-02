const roomRepository = require('./infrastructure/room-admin.repository');
const destinationRepository = require('./infrastructure/destination.repository');
const { getHotelDetails } = require('./application/guest/getHotelDetails');
const { searchRooms } = require('./application/guest/searchRooms');
const { getHotelPolicies } = require('./application/guest/getHotelPolicies');
const { getNearbyPlaces } = require('./application/guest/getNearbyPlaces');
const { getNearbyPlacesByCategory } = require('./application/guest/getNearbyPlacesByCategory');
const { getHotelsByIds } = require('./application/guest/getHotelsByIds');
const { getRecentlyViewedHotels } = require('./application/guest/getRecentlyViewedHotels');
const { getTrendingHotels } = require('./application/guest/getTrendingHotels');
const { recordRecentlyViewedHotel } = require('./application/guest/recordRecentlyViewedHotel');

/**
 * Catalog module - public interface.
 *
 * Owns hotels and rooms: hotel details/search, nearby places, policies, hotel
 * cards, and room lookup. Other modules may only use what is exported here;
 * never Catalog's models or repositories directly.
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

// Destination resolution (used by search before falling back to ES).
async function getActiveDestinationById(destinationId) {
  return await destinationRepository.findActiveById(destinationId);
}

async function findBestMatchDestinationByName(text) {
  return await destinationRepository.findBestMatchByName(text);
}

module.exports = {
  // rooms
  getRoomsForHotel,
  getRoomById,
  getRoomForHotel,

  // destinations
  getActiveDestinationById,
  findBestMatchDestinationByName,

  // hotels
  getHotelDetails,
  searchRooms,
  getHotelPolicies,
  getNearbyPlaces,
  getNearbyPlacesByCategory,
  getHotelsByIds,
  getRecentlyViewedHotels,
  getTrendingHotels,
  recordRecentlyViewedHotel,
};
