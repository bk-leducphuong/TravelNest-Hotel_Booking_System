const logger = require('@config/logger.config');
const ApiError = require('@utils/ApiError');
const roomInventoryRepository = require('../../infrastructure/room_inventory.repository');

const { assertNonEmptyArray, resolveStayDates, toDateOnlyString } = require('./input');

/**
 * Hold rooms for a temporary hold (increment `held_rooms`).
 *
 * @param {{ rooms: Array<{roomId: string, quantity?: number}>, checkInDate: string|Date, checkOutDate: string|Date }} data
 * @param {{ transaction?: object }} options
 */
async function holdRooms(data, options = {}) {
  const { rooms, checkInDate, checkOutDate } = data;
  assertNonEmptyArray(rooms, 'rooms');
  const { start, end } = resolveStayDates(checkInDate, checkOutDate);

  try {
    const holdings = rooms.map((room) => ({
      roomId: room.roomId,
      quantity: room.quantity ?? 1,
    }));

    await roomInventoryRepository.batchIncrementHeld(holdings, start, end, options);

    logger.info('Rooms held successfully', {
      roomCount: holdings.length,
      checkInDate: toDateOnlyString(start),
      checkOutDate: toDateOnlyString(end),
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error holding rooms:', error);
    throw new ApiError(500, 'HOLD_ROOMS_FAILED', 'Failed to hold rooms', {
      originalError: error.message,
    });
  }
}

module.exports = { holdRooms };
