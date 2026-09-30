const logger = require('@config/logger.config');
const ApiError = require('@utils/ApiError');
const roomInventoryRepository = require('@repositories/room_inventory.repository');

const { assertNonEmptyArray, resolveStayDates } = require('./input');

/**
 * Availability check that accounts for temporary holds
 * (available = total_rooms - booked_rooms - held_rooms).
 *
 * @param {{ rooms: Array<{roomId: string, quantity?: number}>, checkInDate: string|Date, checkOutDate: string|Date }} data
 * @returns {Promise<boolean>}
 */
async function checkAvailabilityForHold(data) {
  const { rooms, checkInDate, checkOutDate } = data;
  assertNonEmptyArray(rooms, 'rooms');
  const { start, end } = resolveStayDates(checkInDate, checkOutDate);

  try {
    const reservations = rooms.map((room) => ({
      roomId: room.roomId,
      quantity: room.quantity ?? 1,
    }));

    return await roomInventoryRepository.checkAvailabilityForHold(reservations, start, end);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    logger.error('Error checking availability for hold:', error);
    throw new ApiError(500, 'CHECK_AVAILABILITY_FAILED', 'Failed to check availability for hold', {
      originalError: error.message,
    });
  }
}

module.exports = { checkAvailabilityForHold };
