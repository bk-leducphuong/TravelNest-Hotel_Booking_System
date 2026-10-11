const { RoomInventory } = require('@platform/database');
const sequelize = require('@config/database.config');
const logger = require('@config/logger.config');

const { toDateOnly, enumerateDateObjects } = require('./dates');

async function incrementHeld(roomId, date, quantity, options = {}) {
  try {
    return await RoomInventory.increment(
      { held_rooms: quantity },
      {
        where: {
          room_id: roomId,
          date: toDateOnly(date),
        },
        ...options,
      }
    );
  } catch (error) {
    logger.error('Error incrementing held count:', error);
    throw error;
  }
}

async function decrementHeld(roomId, date, quantity, options = {}) {
  try {
    return await RoomInventory.decrement(
      { held_rooms: quantity },
      {
        where: {
          room_id: roomId,
          date: toDateOnly(date),
        },
        ...options,
      }
    );
  } catch (error) {
    logger.error('Error decrementing held count:', error);
    throw error;
  }
}

async function batchIncrementHeld(holdings, startDate, endDate, options = {}) {
  const transaction = options.transaction || (await sequelize.transaction());
  const shouldCommit = !options.transaction;

  try {
    const dates = enumerateDateObjects(startDate, endDate);

    for (const holding of holdings) {
      for (const date of dates) {
        await incrementHeld(holding.roomId, date, holding.quantity, { transaction });
      }
    }

    if (shouldCommit) {
      await transaction.commit();
    }
  } catch (error) {
    if (shouldCommit) {
      await transaction.rollback();
    }
    logger.error('Error batch incrementing held:', error);
    throw error;
  }
}

async function batchDecrementHeld(holdings, startDate, endDate, options = {}) {
  const transaction = options.transaction || (await sequelize.transaction());
  const shouldCommit = !options.transaction;

  try {
    const dates = enumerateDateObjects(startDate, endDate);

    for (const holding of holdings) {
      for (const date of dates) {
        await decrementHeld(holding.roomId, date, holding.quantity, { transaction });
      }
    }

    if (shouldCommit) {
      await transaction.commit();
    }
  } catch (error) {
    if (shouldCommit) {
      await transaction.rollback();
    }
    logger.error('Error batch decrementing held:', error);
    throw error;
  }
}

module.exports = { incrementHeld, decrementHeld, batchIncrementHeld, batchDecrementHeld };
