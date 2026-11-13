const { getMetrics } = require('./registry');

/**
 * Normalise a SQL statement to a bounded label value.
 *
 * Raw SQL must never become a label: it is unbounded, contains user data, and
 * would explode the series count. Only the leading keyword is kept.
 */
const KNOWN_OPERATIONS = new Set([
  'select',
  'insert',
  'update',
  'delete',
  'replace',
  'set',
  'start',
  'commit',
  'rollback',
  'savepoint',
  'release',
  'show',
  'describe',
  'create',
  'alter',
  'drop',
  'truncate',
  'call',
]);

function sqlOperation(sql) {
  if (typeof sql !== 'string') {
    return 'other';
  }

  const match = /^\s*([a-z]+)/i.exec(sql);
  if (!match) {
    return 'other';
  }

  const operation = match[1].toLowerCase();
  return KNOWN_OPERATIONS.has(operation) ? operation : 'other';
}

/**
 * Record a single Sequelize query. `timingMs` is only supplied when the
 * connection is created with `benchmark: true`.
 */
function recordDbQuery(sql, timingMs) {
  if (typeof timingMs !== 'number' || !Number.isFinite(timingMs) || timingMs < 0) {
    return;
  }

  getMetrics().dbDuration.observe({ operation: sqlOperation(sql) }, timingMs / 1000);
}

/**
 * Wrap Sequelize's `logging` callback so every query is timed, while keeping
 * the existing behaviour (log only when DB_LOGGING is enabled).
 *
 * Sequelize calls `logging(sql, timingMs)` only when `benchmark: true`, so the
 * query timing comes from the same hook that prints SQL in development.
 *
 * @param {false|Function} userLogging
 * @returns {Function}
 */
function wrapSequelizeLogging(userLogging) {
  return (sql, timingMs) => {
    recordDbQuery(sql, timingMs);

    if (typeof userLogging === 'function') {
      userLogging(sql, timingMs);
    }
  };
}

module.exports = {
  KNOWN_OPERATIONS,
  recordDbQuery,
  sqlOperation,
  wrapSequelizeLogging,
};
