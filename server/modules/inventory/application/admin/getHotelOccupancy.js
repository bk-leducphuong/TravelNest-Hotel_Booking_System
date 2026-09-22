const inventoryRepository = require('../../infrastructure/inventory.repository');
const { resolveDateRange } = require('../../domain/inventory-rules');
const { num, round2 } = require('../format');

/**
 * Occupancy / performance summary for a hotel over a range.
 */
async function getHotelOccupancy(hotelId, range = {}) {
  const { startDate, endDate } = resolveDateRange(range);

  const raw = await inventoryRepository.getHotelOccupancy(hotelId, startDate, endDate);

  const totalRooms = num(raw.totalRooms);
  const bookedRooms = num(raw.bookedRooms);
  const heldRooms = num(raw.heldRooms);

  return {
    hotelId,
    startDate,
    endDate,
    totalRooms,
    bookedRooms,
    heldRooms,
    availableRooms: Math.max(0, totalRooms - bookedRooms - heldRooms),
    avgPrice: round2(num(raw.avgPrice)),
    occupancyRate: totalRooms > 0 ? round2((bookedRooms / totalRooms) * 100) : 0,
    dayCount: num(raw.dayCount),
    roomCount: num(raw.roomCount),
  };
}

module.exports = { getHotelOccupancy };
