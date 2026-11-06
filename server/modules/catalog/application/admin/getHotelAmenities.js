const ApiError = require('@utils/ApiError');

const hotelRepository = require('../../infrastructure/hotel.repository');

/** The amenity ids assigned to a hotel. */
async function getHotelAmenities(hotelId) {
  const hotel = await hotelRepository.findByIdForAdmin(hotelId);

  if (!hotel) {
    throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
  }

  const amenityIds = await hotelRepository.findHotelAmenityIds(hotelId);
  return { hotelId, amenityIds };
}

module.exports = { getHotelAmenities };
