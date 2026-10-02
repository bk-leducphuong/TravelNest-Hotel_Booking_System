const logger = require('@config/logger.config');
const ApiError = require('@utils/ApiError');
const roomInventoryRepository = require('../../infrastructure/room_inventory.repository');

const { assertNonEmptyArray, toDateOnlyString } = require('./input');

/**
 * Get raw inventory rows for rooms in a date range.
 *
 * @param {{ roomIds: string[], startDate: string|Date, endDate: string|Date }} data
 * @returns {Promise<Array<object>>} inventory records
 */
async function getInventoryDetails(data) {
  const { roomIds, startDate, endDate } = data;
  assertNonEmptyArray(roomIds, 'roomIds');

  if (!startDate || !endDate) {
    throw new ApiError(400, 'MISSING_DATES', 'startDate and endDate are required');
  }

  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  try {
    const inventories = await roomInventoryRepository.findByRoomsAndDateRange(roomIds, start, end);

    logger.info('Retrieved inventory details', {
      roomIds,
      dateRange: { from: toDateOnlyString(start), to: toDateOnlyString(end) },
      recordCount: inventories.length,
    });

    return inventories;
  } catch (error) {
    logger.error('Error getting inventory details:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'GET_INVENTORY_FAILED', 'Failed to get inventory details', {
      originalError: error.message,
    });
  }
}

module.exports = { getInventoryDetails };
