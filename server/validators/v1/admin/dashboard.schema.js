const Joi = require('joi');

/**
 * Admin Dashboard validation schemas
 * Following RESTful API standards
 */

// Common validations
const hotelIdSchema = Joi.number().integer().positive().required().messages({
  'number.base': 'hotelId must be a number',
  'number.integer': 'hotelId must be an integer',
  'number.positive': 'hotelId must be a positive number',
  'any.required': 'hotelId is required',
});

const periodSchema = Joi.object({
  start: Joi.date().iso().required().messages({
    'date.base': 'start must be a valid date',
    'date.format': 'start must be in ISO format',
    'any.required': 'start date is required',
  }),
  end: Joi.date().iso().min(Joi.ref('start')).required().messages({
    'date.base': 'end must be a valid date',
    'date.format': 'end must be in ISO format',
    'date.min': 'end date must be after or equal to start date',
    'any.required': 'end date is required',
  }),
}).required();

/**
 * GET /api/admin/dashboard/bookings/total
 * Get total bookings count for a hotel in a time period
 */
exports.getTotalBookings = {
  query: Joi.object({
    hotelId: hotelIdSchema,
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  }),
};

/**
 * GET /api/admin/dashboard/revenue/stats
 * Get revenue statistics for a hotel in a time period
 */
exports.getRevenueStats = {
  query: Joi.object({
    hotelId: hotelIdSchema,
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  }),
};

/**
 * GET /api/admin/dashboard/revenue/daily
 * Get daily revenue chart data for a hotel
 */
exports.getDailyRevenueChart = {
  query: Joi.object({
    hotelId: hotelIdSchema,
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  }),
};

/**
 * GET /api/admin/dashboard/rooms/bookings
 * Get room booking statistics for a hotel
 */
exports.getRoomBookings = {
  query: Joi.object({
    hotelId: hotelIdSchema,
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  }),
};

/**
 * GET /api/admin/dashboard/customers/new
 * Get new customers for a hotel in a time period
 */
exports.getNewCustomers = {
  query: Joi.object({
    hotelId: hotelIdSchema,
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  }),
};

/**
 * GET /api/admin/dashboard/revenue/weekly-change
 * Calculate weekly change in revenue
 */
exports.getWeeklyChange = {
  query: Joi.object({
    hotelId: hotelIdSchema,
    currentWeekStart: Joi.date().iso().required(),
    currentWeekEnd: Joi.date().iso().min(Joi.ref('currentWeekStart')).required(),
    previousWeekStart: Joi.date().iso().required(),
    previousWeekEnd: Joi.date().iso().min(Joi.ref('previousWeekStart')).required(),
  }),
};

/**
 * GET /api/admin/dashboard/overview
 * Get complete dashboard overview with all statistics
 */
exports.getDashboardOverview = {
  query: Joi.object({
    hotelId: hotelIdSchema,
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  }),
};
