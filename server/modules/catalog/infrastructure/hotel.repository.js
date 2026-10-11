const find = require('./hotel/find');
const write = require('./hotel/write');
const reviews = require('./hotel/reviews');
const nearby = require('./hotel/nearby');
const policies = require('./hotel/policies');

/**
 * Catalog hotel repository (aggregate).
 *
 * The implementation is split by concern under ./hotel/. Catalog owns the
 * hotels/rooms/etc. tables; other contexts reach them through @modules/catalog.
 */
module.exports = {
  ...find,
  ...write,
  ...reviews,
  ...nearby,
  ...policies,
};
