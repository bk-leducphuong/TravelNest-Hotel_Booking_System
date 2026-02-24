const adminDashboardService = require('@services/admin/dashboard.service');
const asyncHandler = require('@utils/asyncHandler');

/**
 * Admin Dashboard Controller - HTTP ↔ business logic mapping
 * Follows RESTful API standards
 */

/**
 * GET /api/admin/dashboard/bookings/total
 * Get total bookings count
 */
const getTotalBookings = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { hotelId, startDate, endDate } = req.query;

  const result = await adminDashboardService.getTotalBookings(
    hotelId,
    ownerId,
    new Date(startDate),
    new Date(endDate)
  );

  res.status(200).json({
    data: result,
  });
});

/**
 * GET /api/admin/dashboard/revenue/stats
 * Get revenue statistics
 */
const getRevenueStats = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { hotelId, startDate, endDate } = req.query;

  const result = await adminDashboardService.getRevenueStats(
    hotelId,
    ownerId,
    new Date(startDate),
    new Date(endDate)
  );

  res.status(200).json({
    data: result,
  });
});

/**
 * GET /api/admin/dashboard/revenue/daily
 * Get daily revenue chart data
 */
const getDailyRevenueChart = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { hotelId, startDate, endDate } = req.query;

  const result = await adminDashboardService.getDailyRevenueChart(
    hotelId,
    ownerId,
    new Date(startDate),
    new Date(endDate)
  );

  res.status(200).json({
    data: result,
  });
});

/**
 * GET /api/admin/dashboard/rooms/bookings
 * Get room booking statistics
 */
const getRoomBookings = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { hotelId, startDate, endDate } = req.query;

  const result = await adminDashboardService.getRoomBookings(
    hotelId,
    ownerId,
    new Date(startDate),
    new Date(endDate)
  );

  res.status(200).json({
    data: result,
  });
});

/**
 * GET /api/admin/dashboard/customers/new
 * Get new customers
 */
const getNewCustomers = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { hotelId, startDate, endDate } = req.query;

  const result = await adminDashboardService.getNewCustomers(
    hotelId,
    ownerId,
    new Date(startDate),
    new Date(endDate)
  );

  res.status(200).json({
    data: result,
  });
});

/**
 * GET /api/admin/dashboard/revenue/weekly-change
 * Calculate weekly revenue change
 */
const getWeeklyChange = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { hotelId, currentWeekStart, currentWeekEnd, previousWeekStart, previousWeekEnd } =
    req.query;

  const result = await adminDashboardService.getWeeklyChange(
    hotelId,
    ownerId,
    new Date(currentWeekStart),
    new Date(currentWeekEnd),
    new Date(previousWeekStart),
    new Date(previousWeekEnd)
  );

  res.status(200).json({
    data: result,
  });
});

/**
 * GET /api/admin/dashboard/overview
 * Get complete dashboard overview
 */
const getDashboardOverview = asyncHandler(async (req, res) => {
  const ownerId = req.session.user.user_id;
  const { hotelId, startDate, endDate } = req.query;

  const result = await adminDashboardService.getDashboardOverview(
    hotelId,
    ownerId,
    new Date(startDate),
    new Date(endDate)
  );

  res.status(200).json({
    data: result,
  });
});

module.exports = {
  getTotalBookings,
  getRevenueStats,
  getDailyRevenueChart,
  getRoomBookings,
  getNewCustomers,
  getWeeklyChange,
  getDashboardOverview,
};
