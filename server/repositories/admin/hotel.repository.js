const { Op } = require('sequelize');

const { Hotels, Rooms } = require('../../models/index.js');

/**
 * Admin Hotel Repository - Contains all database operations for admin hotel management
 * Only repositories may import Sequelize models
 */

class AdminHotelRepository {
  /**
   * Find all hotels by owner ID with pagination
   */
  async findByOwnerId(ownerId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const { count, rows } = await Hotels.findAndCountAll({
      where: {
        owner_id: ownerId,
      },
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      hotels: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  /**
   * Find hotel by ID
   */
  async findById(hotelId) {
    return await Hotels.findOne({
      where: { id: hotelId },
    });
  }

  /**
   * Find hotel by ID and owner ID (for authorization)
   */
  async findByIdAndOwnerId(hotelId, ownerId) {
    return await Hotels.findOne({
      where: {
        id: hotelId,
        owner_id: ownerId,
      },
    });
  }

  /**
   * Update hotel information
   */
  async update(hotelId, updateData) {
    return await Hotels.update(updateData, {
      where: { id: hotelId },
    });
  }

  /**
   * Verify hotel ownership
   */
  async verifyHotelOwnership(hotelId, ownerId) {
    const hotel = await Hotels.findOne({
      where: {
        id: hotelId,
        owner_id: ownerId,
      },
    });
    return !!hotel;
  }

  /**
   * Get hotel statistics (rooms count, etc.)
   */
  async getHotelStatistics(hotelId) {
    const roomCount = await Rooms.count({
      where: { hotel_id: hotelId },
    });

    const totalRoomCapacity = await Rooms.sum('quantity', {
      where: { hotel_id: hotelId },
    });

    return {
      roomCount: roomCount || 0,
      totalRoomCapacity: totalRoomCapacity || 0,
    };
  }

  /**
   * Get all rooms for a hotel
   */
  async getRoomsByHotelId(hotelId) {
    return await Rooms.findAll({
      where: { hotel_id: hotelId },
      order: [['created_at', 'DESC']],
    });
  }
}

module.exports = new AdminHotelRepository();
