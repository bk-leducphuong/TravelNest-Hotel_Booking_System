const logger = require('@config/logger.config');
const ApiError = require('@utils/ApiError');
const roomInventoryRepository = require('../../infrastructure/room_inventory.repository');

const { assertNonEmptyArray, resolveStayDates, toDateOnlyString } = require('./input');

/**
 * Check whether rooms are available for a date range.
 *
 * @param {{ roomIds: string[], checkInDate: string|Date, checkOutDate: string|Date, quantity?: number }} data
 * @returns {Promise<boolean>} true if all rooms are available
 */
async function checkAvailability(data) {
  const { roomIds, checkInDate, checkOutDate, quantity = 1 } = data;
  assertNonEmptyArray(roomIds, 'roomIds');
  const { start, end } = resolveStayDates(checkInDate, checkOutDate);

  try {
    const isAvailable = await roomInventoryRepository.checkAvailability(
      roomIds,
      start,
      end,
      quantity
    );

    logger.info('Availability check completed', {
      roomIds,
      checkInDate: toDateOnlyString(start),
      checkOutDate: toDateOnlyString(end),
      quantity,
      isAvailable,
    });

    return isAvailable;
  } catch (error) {
    logger.error('Error checking availability:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'CHECK_AVAILABILITY_FAILED', 'Failed to check availability', {
      originalError: error.message,
    });
  }
}

module.exports = { checkAvailability };
