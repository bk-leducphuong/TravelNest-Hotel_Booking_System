const { RoomInventory } = require('@models/index.js');
const logger = require('@config/logger.config');

const { toDateOnly } = require('./dates');

async function create(data, options = {}) {
  try {
    return await RoomInventory.create(
      {
        room_id: data.roomId,
        date: toDateOnly(data.date),
        total_rooms: data.totalInventory,
        booked_rooms: data.totalReserved || 0,
        price_per_night: data.pricePerNight,
        status: data.status || 'open',
      },
      options
    );
  } catch (error) {
    logger.error('Error creating room inventory:', error);
    throw error;
  }
}

async function update(roomId, date, updateData, options = {}) {
  try {
    const mappedData = {};
    if (updateData.totalInventory !== undefined) mappedData.total_rooms = updateData.totalInventory;
    if (updateData.totalReserved !== undefined) mappedData.booked_rooms = updateData.totalReserved;
    if (updateData.pricePerNight !== undefined)
      mappedData.price_per_night = updateData.pricePerNight;
    if (updateData.status !== undefined) mappedData.status = updateData.status;

    return await RoomInventory.update(mappedData, {
      where: {
        room_id: roomId,
        date: toDateOnly(date),
      },
      ...options,
    });
  } catch (error) {
    logger.error('Error updating room inventory:', error);
    throw error;
  }
}

async function bulkCreate(entries, options = {}) {
  try {
    return await RoomInventory.bulkCreate(entries, options);
  } catch (error) {
    logger.error('Error bulk creating room inventory:', error);
    throw error;
  }
}

module.exports = { create, bulkCreate, update };
