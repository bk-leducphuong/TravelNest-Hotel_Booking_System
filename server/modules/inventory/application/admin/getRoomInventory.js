const ApiError = require('@utils/ApiError');
const catalog = require('@modules/catalog');

const inventoryRepository = require('../../infrastructure/inventory.repository');
const { resolveDateRange } = require('../../domain/inventory-rules');
const { num } = require('../format');

/**
 * Raw per-day inventory for a room over a range (calendar cells).
 */
async function getRoomInventory(roomId, range = {}) {
  const room = await catalog.getRoomById(roomId);

  if (!room) {
    throw new ApiError(404, 'ROOM_NOT_FOUND', 'Room not found');
  }

  const { startDate, endDate } = resolveDateRange(range);
  const rows = await inventoryRepository.findByRoomAndRange(roomId, startDate, endDate);

  return {
    roomId,
    roomName: room.room_name,
    hotelId: room.hotel_id,
    startDate,
    endDate,
    days: rows.map((row) => ({
      date: row.date,
      totalRooms: row.total_rooms,
      bookedRooms: row.booked_rooms,
      heldRooms: row.held_rooms,
      availableRooms: Math.max(0, row.total_rooms - row.booked_rooms - row.held_rooms),
      status: row.status,
      pricePerNight: num(row.price_per_night),
      currency: row.currency,
    })),
  };
}

module.exports = { getRoomInventory };
