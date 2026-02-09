const { Holds, HoldRooms } = require('@models/index.js');
const { Op } = require('sequelize');
const logger = require('@config/logger.config');

/**
 * Hold Repository
 * Database operations for room holds (temporary lock during checkout)
 */
class HoldRepository {
  /**
   * Create a hold with its room entries
   * @param {Object} data - Hold data
   * @param {string} data.userId - User ID
   * @param {string} data.hotelId - Hotel ID
   * @param {string} data.checkInDate - Check-in date (DATEONLY)
   * @param {string} data.checkOutDate - Check-out date (DATEONLY)
   * @param {number} data.numberOfGuests - Number of guests
   * @param {number} data.totalPrice - Total price
   * @param {string} data.currency - Currency code
   * @param {Date} data.expiresAt - When the hold expires
   * @param {Array<{roomId: string, quantity: number}>} data.rooms - Rooms to hold
   * @param {Object} options - Sequelize options (transaction)
   * @returns {Promise<Object>} Created hold with holdRooms
   */
  async create(data, options = {}) {
    try {
      const hold = await Holds.create(
        {
          user_id: data.userId,
          hotel_id: data.hotelId,
          check_in_date: data.checkInDate,
          check_out_date: data.checkOutDate,
          number_of_guests: data.numberOfGuests,
          quantity: data.rooms.reduce((sum, r) => sum + (r.quantity || 1), 0),
          total_price: data.totalPrice,
          currency: data.currency || 'USD',
          expires_at: data.expiresAt,
          status: 'active',
        },
        options
      );

      const holdRooms = await HoldRooms.bulkCreate(
        data.rooms.map((r) => ({
          hold_id: hold.id,
          room_id: r.roomId,
          quantity: r.quantity || 1,
        })),
        options
      );

      return { hold, holdRooms };
    } catch (error) {
      logger.error('Error creating hold:', error);
      throw error;
    }
  }

  /**
   * Find hold by ID
   * @param {string} holdId - Hold UUID
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>}
   */
  async findById(holdId, options = {}) {
    try {
      return await Holds.findByPk(holdId, {
        include: options.include || [],
        ...options,
      });
    } catch (error) {
      logger.error('Error finding hold by id:', error);
      throw error;
    }
  }

  /**
   * Find hold by ID with hold rooms
   * @param {string} holdId - Hold UUID
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>}
   */
  async findByIdWithRooms(holdId, options = {}) {
    try {
      return await Holds.findByPk(holdId, {
        include: [
          {
            association: 'holdRooms',
            attributes: ['id', 'room_id', 'quantity'],
          },
        ],
        ...options,
      });
    } catch (error) {
      logger.error('Error finding hold with rooms:', error);
      throw error;
    }
  }

  /**
   * Find active holds for a user (not expired, not released, not completed)
   * @param {string} userId - User UUID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findActiveByUserId(userId, options = {}) {
    try {
      return await Holds.findAll({
        where: {
          user_id: userId,
          status: 'active',
          expires_at: { [Op.gt]: new Date() },
        },
        include: [
          {
            association: 'holdRooms',
            attributes: ['id', 'room_id', 'quantity'],
          },
        ],
        order: [['expires_at', 'ASC']],
        ...options,
      });
    } catch (error) {
      logger.error('Error finding active holds by user:', error);
      throw error;
    }
  }

  /**
   * Update hold status and optionally set released_at
   * @param {string} holdId - Hold UUID
   * @param {Object} updateData - { status, released_at }
   * @param {Object} options - Sequelize options
   * @returns {Promise<[number, Array]>}
   */
  async updateStatus(holdId, updateData, options = {}) {
    try {
      const payload = { status: updateData.status };
      if (updateData.released_at !== undefined) {
        payload.released_at = updateData.released_at;
      }
      return await Holds.update(payload, {
        where: { id: holdId },
        ...options,
      });
    } catch (error) {
      logger.error('Error updating hold status:', error);
      throw error;
    }
  }

  /**
   * Find expired holds that are still active (for cleanup job)
   * @param {Object} options - Query options
   * @returns {Promise<Array<Hold>>}
   */
  async findExpiredActive(options = {}) {
    try {
      return await Holds.findAll({
        where: {
          status: 'active',
          expires_at: { [Op.lte]: new Date() },
        },
        include: [
          {
            association: 'holdRooms',
            attributes: ['id', 'room_id', 'quantity'],
          },
        ],
        ...options,
      });
    } catch (error) {
      logger.error('Error finding expired holds:', error);
      throw error;
    }
  }
}

module.exports = new HoldRepository();
