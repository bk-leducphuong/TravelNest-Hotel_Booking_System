const find = require('./booking/find');
const write = require('./booking/write');
const transactions = require('./booking/transactions');

/**
 * Booking Repository (aggregate).
 *
 * The implementation is split by concern under ./booking/. Booking owns the
 * bookings/booking_rooms tables; other contexts reach them via @modules/booking.
 * (Refund persistence lives in the payment module, which owns the refunds table.)
 */
module.exports = {
  ...find,
  ...write,
  ...transactions,
};
