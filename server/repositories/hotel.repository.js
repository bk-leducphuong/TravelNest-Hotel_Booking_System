const find = require('./hotel/find');
const reviews = require('./hotel/reviews');
const nearby = require('./hotel/nearby');

/**
 * Hotel Repository (aggregate).
 *
 * The implementation is split by concern under ./hotel/; this barrel keeps the
 * public path `@repositories/hotel.repository` stable.
 */
module.exports = {
  ...find,
  ...reviews,
  ...nearby,
};
