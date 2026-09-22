const asyncHandler = require('@utils/asyncHandler');

const { listBookings } = require('../application/admin/listBookings');
const { getBooking } = require('../application/admin/getBooking');
const { getBookingStats } = require('../application/admin/getBookingStats');
const { updateBookingStatus } = require('../application/admin/updateBookingStatus');
const { forceCancelBooking } = require('../application/admin/forceCancelBooking');

const listBookingsHandler = asyncHandler(async (req, res) => {
  const result = await listBookings(req.query);

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

module.exports = {
  listBookingsHandler,
  getBookingHandler,
  getBookingStatsHandler,
  updateBookingStatusHandler,
  cancelBookingHandler,
};
