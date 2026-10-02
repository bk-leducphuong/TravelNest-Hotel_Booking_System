const logger = require('@config/logger.config');

const { findByRoomsAndDateRange } = require('./find');
const { toDateOnly, enumerateDateStrings } = require('./dates');

/**
 * Availability for a hold: (total_rooms - booked_rooms - held_rooms) >= quantity
 * for every room and every date in the range.
 */
async function checkAvailabilityForHold(reservations, startDate, endDate) {
  try {
    const roomIds = reservations.map((reservation) => reservation.roomId);
    const quantityByRoom = new Map(
      reservations.map((reservation) => [reservation.roomId, reservation.quantity || 1])
    );

    const inventories = await findByRoomsAndDateRange(roomIds, startDate, endDate);

    for (const inventory of inventories) {
      const available =
        inventory.total_rooms - inventory.booked_rooms - (inventory.held_rooms || 0);
      const required = quantityByRoom.get(inventory.room_id) || 1;
      if (available < required || inventory.status !== 'open') {
        return false;
      }
    }

    const foundDates = new Set(inventories.map((inventory) => toDateOnly(inventory.date)));
    for (const date of enumerateDateStrings(startDate, endDate)) {
      if (!foundDates.has(date)) {
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error('Error checking availability for hold:', error);
    throw error;
  }
}

/**
 * Availability for booked rooms: (total_rooms - booked_rooms) >= quantity for
 * every room, with inventory present for every date in the range.
 */
async function checkAvailability(roomIds, startDate, endDate, quantity = 1) {
  try {
    const inventories = await findByRoomsAndDateRange(roomIds, startDate, endDate);

    for (const inventory of inventories) {
      const available = inventory.total_rooms - inventory.booked_rooms;
      if (available < quantity || inventory.status !== 'open') {
        return false;
      }
    }

    const foundDates = new Set(inventories.map((inventory) => toDateOnly(inventory.date)));
    for (const date of enumerateDateStrings(startDate, endDate)) {
      if (!foundDates.has(date)) {
        return false; // Missing inventory for this date
      }
    }

    return true;
  } catch (error) {
    logger.error('Error checking availability:', error);
    throw error;
  }
}

module.exports = { checkAvailabilityForHold, checkAvailability };
