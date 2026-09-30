const { RoomInventory } = require('@models/index.js');
const sequelize = require('@config/database.config');
const logger = require('@config/logger.config');

const { toDateOnly, enumerateDateObjects } = require('./dates');

async function incrementReserved(roomId, date, quantity, options = {}) {
  try {
    // Sequelize increment keeps this atomic.
    return await RoomInventory.increment(
      { booked_rooms: quantity },
      {
        where: {
          room_id: roomId,
          date: toDateOnly(date),
        },
        ...options,
      }
    );
  } catch (error) {
    logger.error('Error incrementing reserved count:', error);
    throw error;
  }
}

async function decrementReserved(roomId, date, quantity, options = {}) {
  try {
    return await RoomInventory.decrement(
      { booked_rooms: quantity },
      {
        where: {
          room_id: roomId,
          date: toDateOnly(date),
        },
        ...options,
      }
    );
  } catch (error) {
    logger.error('Error decrementing reserved count:', error);
    throw error;
  }
}

async function batchIncrementReserved(reservations, startDate, endDate, options = {}) {
  const transaction = options.transaction || (await sequelize.transaction());
  const shouldCommit = !options.transaction;

  try {
    const dates = enumerateDateObjects(startDate, endDate);

    for (const reservation of reservations) {
      for (const date of dates) {
        await incrementReserved(reservation.roomId, date, reservation.quantity, { transaction });
      }
    }

    if (shouldCommit) {
      await transaction.commit();
    }
  } catch (error) {
    if (shouldCommit) {
      await transaction.rollback();
    }
    logger.error('Error batch incrementing reserved:', error);
    throw error;
  }
}

async function batchDecrementReserved(reservations, startDate, endDate, options = {}) {
  const transaction = options.transaction || (await sequelize.transaction());
  const shouldCommit = !options.transaction;

  try {
    const dates = enumerateDateObjects(startDate, endDate);

    for (const reservation of reservations) {
      for (const date of dates) {
        await decrementReserved(reservation.roomId, date, reservation.quantity, { transaction });
      }
    }

    if (shouldCommit) {
      await transaction.commit();
    }
  } catch (error) {
    if (shouldCommit) {
      await transaction.rollback();
    }
    logger.error('Error batch decrementing reserved:', error);
    throw error;
  }
}

module.exports = {
  incrementReserved,
  decrementReserved,
  batchIncrementReserved,
  batchDecrementReserved,
};
