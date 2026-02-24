const { Op } = require('sequelize');

const { Bookings, Invoices, Rooms, Users, Hotels } = require('../../models/index.js');
const sequelize = require('../../config/database.config');

/**
 * Admin Dashboard Repository - Contains all database operations for dashboard statistics
 * Only repositories may import Sequelize models
 */

class AdminDashboardRepository {
  /**
   * Get total bookings count for a hotel in a time period
   */
  async getTotalBookingsCount(hotelId, startDate, endDate) {
    return await Bookings.count({
      where: {
        hotel_id: hotelId,
        created_at: {
          [Op.between]: [startDate, endDate],
        },
      },
    });
  }

  /**
   * Get revenue statistics for a hotel
   */
  async getRevenueStats(hotelId, startDate, endDate) {
    const result = await Invoices.findOne({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalRevenue'],
        [sequelize.fn('AVG', sequelize.col('amount')), 'averageRevenue'],
        [sequelize.fn('COUNT', sequelize.col('invoice_id')), 'invoiceCount'],
      ],
      where: {
        hotel_id: hotelId,
        created_at: {
          [Op.between]: [startDate, endDate],
        },
      },
      raw: true,
    });

    return {
      totalRevenue: parseFloat(result.totalRevenue) || 0,
      averageRevenue: parseFloat(result.averageRevenue) || 0,
      invoiceCount: parseInt(result.invoiceCount) || 0,
    };
  }

  /**
   * Get daily revenue chart data
   */
  async getDailyRevenueChart(hotelId, startDate, endDate) {
    const results = await Invoices.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'revenue'],
        [sequelize.fn('COUNT', sequelize.col('invoice_id')), 'count'],
      ],
      where: {
        hotel_id: hotelId,
        created_at: {
          [Op.between]: [startDate, endDate],
        },
      },
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
      raw: true,
    });

    return results.map((row) => ({
      date: row.date,
      revenue: parseFloat(row.revenue) || 0,
      count: parseInt(row.count) || 0,
    }));
  }

  /**
   * Get room booking statistics
   */
  async getRoomBookingStats(hotelId, startDate, endDate) {
    const roomStats = await Bookings.findAll({
      attributes: [
        'room_id',
        [sequelize.fn('COUNT', sequelize.col('booking_id')), 'bookingCount'],
        [sequelize.fn('SUM', sequelize.col('total_price')), 'totalRevenue'],
      ],
      where: {
        hotel_id: hotelId,
        created_at: {
          [Op.between]: [startDate, endDate],
        },
      },
      group: ['room_id'],
      raw: true,
    });

    // Enrich with room names
    const enrichedStats = await Promise.all(
      roomStats.map(async (stat) => {
        const room = await Rooms.findOne({
          where: { id: stat.room_id },
          attributes: ['id', 'room_name', 'room_type'],
        });

        return {
          roomId: stat.room_id,
          roomName: room ? room.room_name : 'Unknown',
          roomType: room ? room.room_type : 'Unknown',
          bookingCount: parseInt(stat.bookingCount) || 0,
          totalRevenue: parseFloat(stat.totalRevenue) || 0,
        };
      })
    );

    return enrichedStats;
  }

  /**
   * Get new customers for a hotel (first-time bookers in the period)
   */
  async getNewCustomers(hotelId, startDate, endDate) {
    // Find users who made their first booking at this hotel during the period
    const newCustomers = await Users.findAll({
      attributes: ['user_id', 'username', 'email', 'profile_picture_url', 'country'],
      distinct: true,
      include: [
        {
          model: Bookings,
          as: 'bookings',
          attributes: [],
          required: true,
          where: {
            hotel_id: hotelId,
            status: {
              [Op.in]: ['confirmed', 'checked in', 'completed'],
            },
            created_at: {
              [Op.between]: [startDate, endDate],
            },
            buyer_id: {
              [Op.notIn]: sequelize.literal(`
                (SELECT DISTINCT buyer_id 
                FROM bookings 
                WHERE hotel_id = ${hotelId}
                AND status IN ('confirmed', 'checked in', 'completed')
                AND created_at < '${startDate}')
              `),
            },
          },
        },
      ],
      raw: true,
    });

    return newCustomers;
  }

  /**
   * Calculate weekly revenue change
   */
  async getWeeklyRevenueChange(hotelId, currentWeekDates, previousWeekDates) {
    const currentRevenue = await Invoices.sum('amount', {
      where: {
        hotel_id: hotelId,
        created_at: {
          [Op.between]: [currentWeekDates.start, currentWeekDates.end],
        },
      },
    });

    const previousRevenue = await Invoices.sum('amount', {
      where: {
        hotel_id: hotelId,
        created_at: {
          [Op.between]: [previousWeekDates.start, previousWeekDates.end],
        },
      },
    });

    const currentRevenueValue = parseFloat(currentRevenue) || 0;
    const previousRevenueValue = parseFloat(previousRevenue) || 0;

    const change =
      previousRevenueValue > 0
        ? ((currentRevenueValue - previousRevenueValue) / previousRevenueValue) * 100
        : 0;

    return {
      currentWeek: currentRevenueValue,
      previousWeek: previousRevenueValue,
      changePercentage: parseFloat(change.toFixed(2)),
    };
  }

  /**
   * Verify hotel ownership
   */
  async verifyHotelOwnership(hotelId, ownerId) {
    const hotel = await Hotels.findOne({
      where: {
        hotel_id: hotelId,
        owner_id: ownerId,
      },
    });
    return !!hotel;
  }

  /**
   * Get booking status breakdown
   */
  async getBookingStatusBreakdown(hotelId, startDate, endDate) {
    const statusCounts = await Bookings.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('booking_id')), 'count']],
      where: {
        hotel_id: hotelId,
        created_at: {
          [Op.between]: [startDate, endDate],
        },
      },
      group: ['status'],
      raw: true,
    });

    return statusCounts.map((row) => ({
      status: row.status,
      count: parseInt(row.count) || 0,
    }));
  }
}

module.exports = new AdminDashboardRepository();
