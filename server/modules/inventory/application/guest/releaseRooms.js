const logger = require('@config/logger.config');
const ApiError = require('@utils/ApiError');
const roomInventoryRepository = require('../../infrastructure/room_inventory.repository');

const { assertNonEmptyArray, resolveStayDates, toDateOnlyString } = require('./input');

/**
 * Release rooms from a cancelled booking (decrement `booked_rooms`).
 *
 * @param {{ bookedRooms: Array<{room_id: string, roomQuantity?: number}>, checkInDate: string|Date, checkOutDate: string|Date }} data
 * @param {{ transaction?: object }} options
 */
async function releaseRooms(data, options = {}) {
  const { bookedRooms, checkInDate, checkOutDate } = data;
  assertNonEmptyArray(bookedRooms, 'bookedRooms');
  const { start, end } = resolveStayDates(checkInDate, checkOutDate);

  try {
    const reservations = bookedRooms.map((room) => ({
      roomId: room.room_id,
      quantity: room.roomQuantity || 1,
    }));

    logger.info('Releasing rooms', {
      reservations,
      checkInDate: toDateOnlyString(start),
      checkOutDate: toDateOnlyString(end),
    });

    await roomInventoryRepository.batchDecrementReserved(reservations, start, end, options);

    logger.info('Rooms released successfully', {
      roomCount: reservations.length,
      dateRange: { from: toDateOnlyString(start), to: toDateOnlyString(end) },
    });
  } catch (error) {
    logger.error('Error releasing rooms:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'RELEASE_ROOMS_FAILED', 'Failed to release rooms', {
      originalError: error.message,
    });
  }
}

module.exports = { releaseRooms };
