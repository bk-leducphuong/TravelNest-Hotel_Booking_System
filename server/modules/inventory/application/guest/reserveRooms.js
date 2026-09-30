const logger = require('@config/logger.config');
const ApiError = require('@utils/ApiError');
const roomInventoryRepository = require('@repositories/room_inventory.repository');

const { assertNonEmptyArray, resolveStayDates, toDateOnlyString } = require('./input');

/**
 * Reserve rooms for a booking (increment `booked_rooms` across the date range).
 *
 * @param {{ bookedRooms: Array<{room_id: string, roomQuantity?: number}>, checkInDate: string|Date, checkOutDate: string|Date }} data
 * @param {{ transaction?: object }} options
 */
async function reserveRooms(data, options = {}) {
  const { bookedRooms, checkInDate, checkOutDate } = data;
  assertNonEmptyArray(bookedRooms, 'bookedRooms');
  const { start, end } = resolveStayDates(checkInDate, checkOutDate);

  try {
    const reservations = bookedRooms.map((room) => ({
      roomId: room.room_id,
      quantity: room.roomQuantity || 1,
    }));

    logger.info('Reserving rooms', {
      reservations,
      checkInDate: toDateOnlyString(start),
      checkOutDate: toDateOnlyString(end),
    });

    await roomInventoryRepository.batchIncrementReserved(reservations, start, end, options);

    logger.info('Rooms reserved successfully', {
      roomCount: reservations.length,
      dateRange: { from: toDateOnlyString(start), to: toDateOnlyString(end) },
    });
  } catch (error) {
    logger.error('Error reserving rooms:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'RESERVE_ROOMS_FAILED', 'Failed to reserve rooms', {
      originalError: error.message,
    });
  }
}

module.exports = { reserveRooms };
