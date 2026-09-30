const find = require('./booking/find');
const write = require('./booking/write');
const refunds = require('./booking/refunds');
const transactions = require('./booking/transactions');

/**
 * Booking Repository (aggregate).
 *
 * The implementation is split by concern under ./booking/; this barrel keeps the
 * public path `@repositories/booking.repository` stable.
 */
module.exports = {
  ...find,
  ...write,
  ...refunds,
  ...transactions,
};
