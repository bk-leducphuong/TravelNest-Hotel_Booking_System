const find = require('./hotel/find');
const locations = require('./hotel/locations');
const write = require('./hotel/write');
const reviews = require('./hotel/reviews');
const nearby = require('./hotel/nearby');
const policies = require('./hotel/policies');
const amenities = require('./hotel/amenities');
const cancellationRules = require('./hotel/cancellation-rules');

/**
 * Catalog hotel repository (aggregate).
 *
 * The implementation is split by concern under ./hotel/. Catalog owns the
 * hotels/rooms/etc. tables; other contexts reach them through @modules/catalog.
 */
module.exports = {
  ...find,
  ...locations,
  ...write,
  ...reviews,
  ...nearby,
  ...policies,
  ...amenities,
  ...cancellationRules,
};
