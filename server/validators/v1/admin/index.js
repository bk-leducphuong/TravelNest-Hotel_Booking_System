/**
 * Admin Validators Index
 * Exports all admin validation schemas
 */

const bookingSchema = require('./booking.schema');
const dashboardSchema = require('./dashboard.schema');
const hotelSchema = require('./hotel.schema');
const notificationSchema = require('./notification.schema');
const roomSchema = require('./room.schema');

module.exports = {
  bookingSchema,
  dashboardSchema,
  hotelSchema,
  notificationSchema,
  roomSchema,
};
