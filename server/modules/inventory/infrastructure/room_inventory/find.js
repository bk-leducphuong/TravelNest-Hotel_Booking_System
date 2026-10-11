const { Op } = require('sequelize');

const { RoomInventory } = require('@platform/database');
const logger = require('@config/logger.config');

const { toDateOnly } = require('./dates');

async function findByRoomAndDate(roomId, date, options = {}) {
  try {
    return await RoomInventory.findOne({
      where: {
        room_id: roomId,
        date: toDateOnly(date),
      },
      ...options,
    });
  } catch (error) {
    logger.error('Error finding room inventory:', error);
    throw error;
  }
}

async function findByRoomsAndDateRange(roomIds, startDate, endDate, options = {}) {
  try {
    return await RoomInventory.findAll({
      where: {
        room_id: {
          [Op.in]: roomIds,
        },
        date: {
          [Op.gte]: toDateOnly(startDate),
          [Op.lt]: toDateOnly(endDate), // Exclusive end date
        },
      },
      ...options,
    });
  } catch (error) {
    logger.error('Error finding room inventory by range:', error);
    throw error;
  }
}

module.exports = { findByRoomAndDate, findByRoomsAndDateRange };
