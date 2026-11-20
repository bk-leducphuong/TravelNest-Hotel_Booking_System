const { createSequelize } = require('./database.options');
const { instrumentSequelizePool } = require('../platform/metrics/infrastructure/pool.metrics');

// Connection, pool and retry settings all live in `config/database.options.js` so
// the app runtime and sequelize-cli cannot drift apart.
const sequelize = createSequelize();

// The pool is created on first connect, so expose it lazily to the gauges.
instrumentSequelizePool(() => sequelize.connectionManager && sequelize.connectionManager.pool);

module.exports = sequelize;
