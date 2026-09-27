const catalog = require('@modules/catalog');

const inventoryRepository = require('../../infrastructure/inventory.repository');
const { resolveDateRange } = require('../../domain/inventory-rules');
const { num, round2 } = require('../format');

/**
 * Rooms for a hotel plus an aggregated inventory summary per room for the
 * requested range. This is the "availability list" the admin calendar loads.
 */
async function listRoomInventory(hotelId, range = {}) {
  const { startDate, endDate } = resolveDateRange(range);

  const [rooms, summaries] = await Promise.all([
    catalog.getRoomsForHotel(hotelId),
    inventoryRepository.getRoomSummaries(hotelId, startDate, endDate),
  ]);

  const summaryByRoom = new Map(
    summaries.map((summary) => [
      summary.room_id,
      {
        totalRooms: num(summary.totalRooms),
        bookedRooms: num(summary.bookedRooms),
        heldRooms: num(summary.heldRooms),
        availableRooms: Math.max(
          0,
          num(summary.totalRooms) - num(summary.bookedRooms) - num(summary.heldRooms)
        ),
        avgPrice: round2(num(summary.avgPrice)),
        minPrice: round2(num(summary.minPrice)),
        maxPrice: round2(num(summary.maxPrice)),
        dayCount: num(summary.dayCount),
      },
    ])
  );

  return {
    hotelId,
    startDate,
    endDate,
    rooms: rooms.map((room) => ({
      roomId: room.id,
      roomName: room.room_name,
      roomType: room.room_type,
      roomStatus: room.status,
      quantity: room.quantity,
      hasInventory: summaryByRoom.has(room.id),
      inventory: summaryByRoom.get(room.id) || null,
    })),
  };
}

module.exports = { listRoomInventory };
