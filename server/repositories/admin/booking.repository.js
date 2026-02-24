const { Op } = require('sequelize');

const { Bookings, Users, Hotels, Rooms } = require('../../models/index.js');
const sequelize = require('../../config/database.config');

/**
 * Admin Booking Repository - Contains all database operations for admin bookings
 * Only repositories may import Sequelize models
 */

class AdminBookingRepository {
  /**
   * Find all bookings by hotel ID with optional filters
   */
  async findByHotelId(hotelId, options = {}) {
    const { status, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const where = {
      hotel_id: hotelId,
    };

    if (status) {
      where.status = status;
    }

    const { count, rows } = await Bookings.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      bookings: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  /**
   * Find booking by ID and hotel ID (for authorization)
   */
  async findByIdAndHotelId(bookingId, hotelId) {
    return await Bookings.findOne({
      where: {
        id: bookingId,
        hotel_id: hotelId,
      },
    });
  }

  /**
   * Find booking by ID
   */
  async findById(bookingId) {
    return await Bookings.findOne({
      where: { id: bookingId },
    });
  }

  /**
   * Update booking status for a specific hotel
   * Updates status to 'checked in' or 'completed' based on current date
   */
  async updateStatusByDates(hotelId) {
    return await Bookings.update(
      {
        status: sequelize.literal(`CASE
          WHEN (CURRENT_DATE() BETWEEN check_in_date AND check_out_date) THEN 'checked in'
          WHEN CURRENT_DATE() > check_out_date THEN 'completed'
          ELSE status
          END`),
      },
      {
        where: {
          hotel_id: hotelId,
          status: {
            [Op.ne]: 'cancelled',
          },
        },
      }
    );
  }

  /**
   * Update booking status
   */
  async updateStatus(bookingId, status) {
    return await Bookings.update(
      { status },
      {
        where: { id: bookingId },
      }
    );
  }

  /**
   * Find user (booker) by ID
   */
  async findUserById(userId) {
    return await Users.findOne({
      where: { id: userId },
      attributes: ['id', 'username', 'email', 'country', 'phone_number'],
    });
  }

  /**
   * Find hotel by ID
   */
  async findHotelById(hotelId) {
    return await Hotels.findOne({
      where: { id: hotelId },
      attributes: ['id', 'name', 'city', 'image_urls'],
    });
  }

  /**
   * Find room by ID
   */
  async findRoomById(roomId) {
    return await Rooms.findOne({
      where: { id: roomId },
      attributes: ['id', 'room_name', 'room_type'],
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
   * Get booking statistics for a hotel
   */
  async getBookingStatistics(hotelId, startDate, endDate) {
    const where = {
      hotel_id: hotelId,
    };

    if (startDate && endDate) {
      where.created_at = {
        [Op.between]: [startDate, endDate],
      };
    }

    const statusCounts = await Bookings.findAll({
      where,
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true,
    });

    const totalBookings = await Bookings.count({ where });

    return {
      totalBookings,
      statusBreakdown: statusCounts,
    };
  }
}

module.exports = new AdminBookingRepository();
