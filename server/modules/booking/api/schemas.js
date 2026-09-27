const Joi = require('joi');

/**
 * Booking module validation schemas (admin).
 */

const uuid = Joi.string().uuid({ version: ['uuidv4', 'uuidv5', 'uuidv7'] });
const isoDate = Joi.date().iso();
const paginationQuery = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

const BOOKING_STATUSES = [
  'pending',
  'pending_payment',
  'confirmed',
  'payment_failed',
  'expired',
  'checked_in',
  'completed',
  'cancelled',
  'no_show',
];

// Cancellation is a dedicated endpoint; these are the plain transitions.
const ASSIGNABLE_STATUSES = ['confirmed', 'checked_in', 'completed', 'no_show'];

const listBookings = {
  query: Joi.object({
    hotelId: uuid,
    status: Joi.string().valid(...BOOKING_STATUSES),
    bookingCode: Joi.string().max(100),
    roomId: uuid,
    buyerId: uuid,
    dateFrom: isoDate,
    dateTo: isoDate,
    ...paginationQuery,
  }).unknown(false),
};

const getBooking = {
  params: Joi.object({ bookingId: uuid.required() }).required(),
};

const getBookingStats = {
  params: Joi.object({ hotelId: uuid.required() }).required(),
};

const updateBookingStatus = {
  params: Joi.object({ bookingId: uuid.required() }).required(),
  body: Joi.object({
    status: Joi.string()
      .valid(...ASSIGNABLE_STATUSES)
      .required(),
  }).required(),
};

const cancelBooking = {
  params: Joi.object({ bookingId: uuid.required() }).required(),
  body: Joi.object({
    reason: Joi.string().max(1000).allow('', null),
    processRefund: Joi.boolean().default(false),
    refundAmount: Joi.number().greater(0),
  }).required(),
};

module.exports = {
  listBookings,
  getBooking,
  getBookingStats,
  updateBookingStatus,
  cancelBooking,
};
