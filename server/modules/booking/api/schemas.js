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

const getBookingTrend = {
  params: Joi.object({ hotelId: uuid.required() }).required(),
  query: Joi.object({
    days: Joi.number().integer().min(1).max(90).default(14),
  }).unknown(false),
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

const createBooking = {
  body: Joi.object({
    roomId: uuid.required(),
    checkInDate: isoDate.required(),
    checkOutDate: isoDate.required(),
    quantity: Joi.number().integer().min(1).default(1),
    numberOfGuests: Joi.number().integer().min(1).default(1),
    buyerId: uuid,
    guestEmail: Joi.string()
      .email({ tlds: { allow: false } })
      .max(255),
    specialRequests: Joi.string().max(2000).allow('', null),
    guestDetails: Joi.object().unknown(true),
    totalPrice: Joi.number().min(0),
  })
    .xor('buyerId', 'guestEmail')
    .required(),
};

const getReservationCalendar = {
  params: Joi.object({ hotelId: uuid.required() }).required(),
  query: Joi.object({
    startDate: isoDate.required(),
    endDate: isoDate.required(),
  }).unknown(false),
};

const getReservationBoard = {
  params: Joi.object({ hotelId: uuid.required() }).required(),
  query: Joi.object({
    date: isoDate,
  }).unknown(false),
};

module.exports = {
  listBookings,
  getBooking,
  getBookingStats,
  getBookingTrend,
  updateBookingStatus,
  cancelBooking,
  createBooking,
  getReservationCalendar,
  getReservationBoard,
};
