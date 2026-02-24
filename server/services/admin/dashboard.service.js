const adminDashboardRepository = require('../../repositories/admin/dashboard.repository');
const ApiError = require('../../utils/ApiError');

/**
 * Admin Dashboard Service - Contains main business logic for dashboard statistics
 * Follows RESTful API standards
 */

class AdminDashboardService {
  /**
   * Verify hotel ownership for all operations
   */
  async verifyAccess(hotelId, ownerId) {
    const isOwner = await adminDashboardRepository.verifyHotelOwnership(hotelId, ownerId);

    if (!isOwner) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to access this hotel');
    }
  }

  /**
   * Get total bookings count
   */
  async getTotalBookings(hotelId, ownerId, startDate, endDate) {
    await this.verifyAccess(hotelId, ownerId);

    const count = await adminDashboardRepository.getTotalBookingsCount(hotelId, startDate, endDate);

    return { totalBookings: count, period: { startDate, endDate } };
  }

  /**
   * Get revenue statistics
   */
  async getRevenueStats(hotelId, ownerId, startDate, endDate) {
    await this.verifyAccess(hotelId, ownerId);

    const stats = await adminDashboardRepository.getRevenueStats(hotelId, startDate, endDate);

    return {
      ...stats,
      period: { startDate, endDate },
    };
  }

  /**
   * Get daily revenue chart data
   */
  async getDailyRevenueChart(hotelId, ownerId, startDate, endDate) {
    await this.verifyAccess(hotelId, ownerId);

    const chartData = await adminDashboardRepository.getDailyRevenueChart(
      hotelId,
      startDate,
      endDate
    );

    return {
      data: chartData,
      period: { startDate, endDate },
    };
  }

  /**
   * Get room booking statistics
   */
  async getRoomBookings(hotelId, ownerId, startDate, endDate) {
    await this.verifyAccess(hotelId, ownerId);

    const roomStats = await adminDashboardRepository.getRoomBookingStats(
      hotelId,
      startDate,
      endDate
    );

    return {
      rooms: roomStats,
      period: { startDate, endDate },
    };
  }

  /**
   * Get new customers
   */
  async getNewCustomers(hotelId, ownerId, startDate, endDate) {
    await this.verifyAccess(hotelId, ownerId);

    const customers = await adminDashboardRepository.getNewCustomers(hotelId, startDate, endDate);

    return {
      customers,
      count: customers.length,
      period: { startDate, endDate },
    };
  }

  /**
   * Get weekly revenue change
   */
  async getWeeklyChange(
    hotelId,
    ownerId,
    currentWeekStart,
    currentWeekEnd,
    previousWeekStart,
    previousWeekEnd
  ) {
    await this.verifyAccess(hotelId, ownerId);

    const change = await adminDashboardRepository.getWeeklyRevenueChange(
      hotelId,
      { start: currentWeekStart, end: currentWeekEnd },
      { start: previousWeekStart, end: previousWeekEnd }
    );

    return {
      ...change,
      currentWeekPeriod: { start: currentWeekStart, end: currentWeekEnd },
      previousWeekPeriod: { start: previousWeekStart, end: previousWeekEnd },
    };
  }

  /**
   * Get complete dashboard overview
   * Returns all statistics in a single call for efficiency
   */
  async getDashboardOverview(hotelId, ownerId, startDate, endDate) {
    await this.verifyAccess(hotelId, ownerId);

    // Fetch all statistics in parallel
    const [totalBookings, revenueStats, dailyRevenue, roomBookings, newCustomers, statusBreakdown] =
      await Promise.all([
        adminDashboardRepository.getTotalBookingsCount(hotelId, startDate, endDate),
        adminDashboardRepository.getRevenueStats(hotelId, startDate, endDate),
        adminDashboardRepository.getDailyRevenueChart(hotelId, startDate, endDate),
        adminDashboardRepository.getRoomBookingStats(hotelId, startDate, endDate),
        adminDashboardRepository.getNewCustomers(hotelId, startDate, endDate),
        adminDashboardRepository.getBookingStatusBreakdown(hotelId, startDate, endDate),
      ]);

    return {
      period: { startDate, endDate },
      bookings: {
        total: totalBookings,
        statusBreakdown,
      },
      revenue: {
        ...revenueStats,
        dailyChart: dailyRevenue,
      },
      rooms: roomBookings,
      customers: {
        new: newCustomers,
        count: newCustomers.length,
      },
    };
  }
}

module.exports = new AdminDashboardService();
