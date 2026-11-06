const asyncHandler = require('@utils/asyncHandler');

const { listBookings } = require('../application/admin/listBookings');
const { getBooking } = require('../application/admin/getBooking');
const { getBookingStats } = require('../application/admin/getBookingStats');
const { getBookingTrend } = require('../application/admin/getBookingTrend');
const { updateBookingStatus } = require('../application/admin/updateBookingStatus');
const { forceCancelBooking } = require('../application/admin/forceCancelBooking');
const { createManualBooking } = require('../application/admin/createManualBooking');
const { getReservationCalendar } = require('../application/admin/getReservationCalendar');
const { getReservationBoard } = require('../application/admin/getReservationBoard');

const listBookingsHandler = asyncHandler(async (req, res) => {
  const result = await listBookings({
    ...req.query,
    hotelId: req.hotelContext?.hotelId || req.query.hotelId,
  });

  res.status(200).json({
    data: result.bookings,
    meta: { page: result.page, limit: result.limit, total: result.total },
  });
});

const getBookingHandler = asyncHandler(async (req, res) => {
  const booking = await getBooking(req.params.bookingId);

  res.status(200).json({ data: booking });
});

const getBookingStatsHandler = asyncHandler(async (req, res) => {
  const stats = await getBookingStats(req.params.hotelId);

  res.status(200).json({ data: stats });
});

const getBookingTrendHandler = asyncHandler(async (req, res) => {
  const trend = await getBookingTrend(req.params.hotelId, { days: req.query.days });

  res.status(200).json({ data: trend });
});

const updateBookingStatusHandler = asyncHandler(async (req, res) => {
  const result = await updateBookingStatus(req.params.bookingId, {
    status: req.body.status,
    actorUserId: req.user.id,
    requestId: req.id,
  });

  res.status(200).json({ data: result });
});

const cancelBookingHandler = asyncHandler(async (req, res) => {
  const result = await forceCancelBooking(req.params.bookingId, {
    reason: req.body.reason,
    processRefund: req.body.processRefund,
    refundAmount: req.body.refundAmount,
    actorUserId: req.user.id,
    requestId: req.id,
  });

  res.status(200).json({ data: result });
});

const createBookingHandler = asyncHandler(async (req, res) => {
  const hotelId = req.hotelContext?.hotelId || req.body.hotelId;
  const result = await createManualBooking(hotelId, req.body, {
    actorUserId: req.user.id,
    requestId: req.id,
  });

  res.status(201).json({ data: result });
});

const getReservationCalendarHandler = asyncHandler(async (req, res) => {
  const data = await getReservationCalendar(req.params.hotelId, req.query);
  res.status(200).json({ data });
});

const getReservationBoardHandler = asyncHandler(async (req, res) => {
  const data = await getReservationBoard(req.params.hotelId, req.query);
  res.status(200).json({ data });
});

module.exports = {
  listBookingsHandler,
  getBookingHandler,
  getBookingStatsHandler,
  getBookingTrendHandler,
  updateBookingStatusHandler,
  cancelBookingHandler,
  createBookingHandler,
  getReservationCalendarHandler,
  getReservationBoardHandler,
};
