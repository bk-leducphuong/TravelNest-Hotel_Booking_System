const { Op, fn, col } = require('sequelize');

const { room_inventory: RoomInventory, rooms: Rooms } = require('@models/index.js');

/**
 * Inventory repository - the only place that touches the room_inventory table.
 * `booked_rooms` and `held_rooms` are system-managed; admins only set
 * allotment (`total_rooms`), price, currency and status.
 */
class InventoryRepository {
  async findByRoomAndRange(roomId, startDate, endDate, options = {}) {
    return await RoomInventory.findAll({
      where: {
        room_id: roomId,
        date: { [Op.between]: [startDate, endDate] },
      },
      attributes: [
        'room_id',
        'date',
        'total_rooms',
        'booked_rooms',
        'held_rooms',
        'status',
        'price_per_night',
        'currency',
      ],
      order: [['date', 'ASC']],
      ...options,
    });
  }

  async findExistingByDates(roomId, dates, options = {}) {
    if (!dates.length) {
      return [];
    }

    return await RoomInventory.findAll({
      where: {
        room_id: roomId,
        date: { [Op.in]: dates },
      },
      raw: true,
      ...options,
    });
  }

  async findLatestForRoom(roomId, options = {}) {
    return await RoomInventory.findOne({
      where: { room_id: roomId },
      attributes: ['price_per_night', 'currency'],
      order: [['date', 'DESC']],
      raw: true,
      ...options,
    });
  }

  async upsert(roomId, date, values, options = {}) {
    const existing = await RoomInventory.findOne({
      where: { room_id: roomId, date },
      ...options,
    });

    if (existing) {
      await existing.update(values, options);
      return { created: false, instance: existing };
    }

    const created = await RoomInventory.create({ room_id: roomId, date, ...values }, options);
    return { created: true, instance: created };
  }

  async getRoomSummaries(hotelId, startDate, endDate, options = {}) {
    return await RoomInventory.findAll({
      attributes: [
        'room_id',
        [fn('SUM', col('total_rooms')), 'totalRooms'],
        [fn('SUM', col('booked_rooms')), 'bookedRooms'],
        [fn('SUM', col('held_rooms')), 'heldRooms'],
        [fn('AVG', col('price_per_night')), 'avgPrice'],
        [fn('MIN', col('price_per_night')), 'minPrice'],
        [fn('MAX', col('price_per_night')), 'maxPrice'],
        [fn('COUNT', col('room_inventory.date')), 'dayCount'],
      ],
      include: [
        {
          model: Rooms,
          as: 'room',
          attributes: [],
          where: { hotel_id: hotelId },
          required: true,
        },
      ],
      where: {
        date: { [Op.between]: [startDate, endDate] },
      },
      group: ['room_inventory.room_id'],
      raw: true,
      subQuery: false,
      ...options,
    });
  }

  async getHotelOccupancy(hotelId, startDate, endDate, options = {}) {
    return await RoomInventory.findOne({
      attributes: [
        [fn('SUM', col('total_rooms')), 'totalRooms'],
        [fn('SUM', col('booked_rooms')), 'bookedRooms'],
        [fn('SUM', col('held_rooms')), 'heldRooms'],
        [fn('AVG', col('price_per_night')), 'avgPrice'],
        [fn('COUNT', col('room_inventory.date')), 'dayCount'],
        [fn('COUNT', fn('DISTINCT', col('room_inventory.room_id'))), 'roomCount'],
      ],
      include: [
        {
          model: Rooms,
          as: 'room',
          attributes: [],
          where: { hotel_id: hotelId },
          required: true,
        },
      ],
      where: {
        date: { [Op.between]: [startDate, endDate] },
      },
      raw: true,
      subQuery: false,
      ...options,
    });
  }
}

module.exports = new InventoryRepository();
