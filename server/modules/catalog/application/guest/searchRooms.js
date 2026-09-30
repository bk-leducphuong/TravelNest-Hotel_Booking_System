const ApiError = require('@utils/ApiError');
const hotelRepository = require('@repositories/hotel.repository');
const roomRepository = require('@repositories/room.repository');

const { formatRooms } = require('./formatters');

/**
 * Search available rooms for a hotel.
 *
 * @param {string} hotelId
 * @param {{ checkInDate: string, checkOutDate: string, numberOfNights: number, numberOfRooms?: number, numberOfGuests?: number, page?: number, limit?: number }} searchParams
 * @returns {Promise<{ rooms: object[], page: number, limit: number, total: number }>}
 */
async function searchRooms(hotelId, searchParams) {
  const {
    checkInDate,
    checkOutDate,
    numberOfNights,
    numberOfRooms = 1,
    numberOfGuests,
    page = 1,
    limit = 20,
  } = searchParams;

  if (!checkInDate || !checkOutDate || !numberOfNights) {
    throw new ApiError(
      400,
      'MISSING_PARAMETERS',
      'checkInDate and checkOutDate are required (numberOfNights is inferred from them)'
    );
  }

  const hotel = await hotelRepository.findById(hotelId);
  if (!hotel) {
    throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
  }

  const validatedLimit = Math.min(limit, 100);
  const offset = (page - 1) * validatedLimit;

  const rooms = await roomRepository.findAvailableRooms(hotelId, checkInDate, checkOutDate, {
    numberOfRooms,
    numberOfNights,
    numberOfGuests,
    limit: validatedLimit,
    offset,
  });

  return {
    rooms: formatRooms(rooms),
    page,
    limit: validatedLimit,
    total: rooms.length, // approximate; a full count would need a separate query
  };
}

module.exports = { searchRooms };
