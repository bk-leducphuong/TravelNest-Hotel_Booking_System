/**
 * Admin Repositories Index
 * Exports all admin repositories
 */

const adminBookingRepository = require('./booking.repository');
const adminDashboardRepository = require('./dashboard.repository');
const adminHotelRepository = require('./hotel.repository');
const adminNotificationRepository = require('./notification.repository');
const adminRoomRepository = require('./room.repository');

module.exports = {
  adminBookingRepository,
  adminDashboardRepository,
  adminHotelRepository,
  adminNotificationRepository,
  adminRoomRepository,
};
