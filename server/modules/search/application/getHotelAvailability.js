const ApiError = require('@utils/ApiError');
const searchRepository = require('../infrastructure/search.repository');

/**
 * Availability + room pricing for a single hotel on a date range.
 */
async function getHotelAvailability(hotelId, params) {
  const { checkIn, checkOut, rooms, adults, children } = params;
  const totalGuests = adults + (children || 0);

  const availability = await searchRepository.checkDateRangeAvailability({
    hotelIds: [hotelId],
    checkIn,
    checkOut,
    requiredRooms: rooms,
    totalGuests,
  });

  if (availability.length === 0) {
    throw new ApiError(404, 'NOT_AVAILABLE', 'Hotel not available for selected dates');
  }

  const roomDetails = await searchRepository.getAvailableRoomsForHotel({
    hotelId,
    checkIn,
    checkOut,
    requiredRooms: rooms,
    totalGuests,
  });

  const hotelDetails = await searchRepository.getHotelDetailsByIds([hotelId]);

  return {
    success: true,
    data: {
      hotel: hotelDetails[0],
      availability: {
        is_available: true,
        available_rooms: roomDetails,
        total_available_rooms: availability[0].total_available_rooms,
      },
      search_params: {
        checkIn,
        checkOut,
        nights: Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)),
        adults,
        children,
        rooms,
      },
    },
  };
}

module.exports = { getHotelAvailability };
