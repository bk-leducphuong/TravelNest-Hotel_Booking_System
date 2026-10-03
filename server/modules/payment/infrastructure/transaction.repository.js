const find = require('./transaction/find');
const write = require('./transaction/write');
const statistics = require('./transaction/statistics');

/**
 * Transaction Repository (aggregate).
 *
 * The implementation is split by concern under ./transaction/; this barrel keeps
 * the public path `../../infrastructure/transaction.repository` stable.
 */
module.exports = {
  ...find,
  ...write,
  ...statistics,
};
