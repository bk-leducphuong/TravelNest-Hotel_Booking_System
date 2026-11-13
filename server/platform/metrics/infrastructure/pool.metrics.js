const client = require('prom-client');

const { getMetrics } = require('./registry');

let registered = false;

/**
 * Database pool gauges.
 *
 * The Sequelize pool is created lazily on the first connection, so the getter
 * is evaluated at scrape time instead of capturing a possibly-undefined pool.
 *
 * @param {object} registry prom-client Registry
 * @param {() => object|null} getPool returns the sequelize-pool instance
 */
function createPoolGauges(registry, getPool) {
  const connections = new client.Gauge({
    name: 'db_pool_connections',
    help: 'Sequelize connection pool connections, by state',
    labelNames: ['state'],
    registers: [registry],
    collect() {
      const pool = getPool();
      if (!pool) {
        return;
      }

      this.set({ state: 'used' }, pool.using || 0);
      this.set({ state: 'idle' }, pool.available || 0);
      this.set({ state: 'waiting' }, pool.waiting || 0);
    },
  });

  const maxConnections = new client.Gauge({
    name: 'db_pool_connections_max',
    help: 'Configured maximum size of the Sequelize connection pool',
    registers: [registry],
    collect() {
      const pool = getPool();
      if (!pool) {
        return;
      }

      this.set(pool.maxSize || 0);
    },
  });

  return { connections, maxConnections };
}

/**
 * Register pool gauges on the process registry. Idempotent.
 *
 * @param {() => object|null} getPool
 */
function instrumentSequelizePool(getPool) {
  if (registered || typeof getPool !== 'function') {
    return;
  }

  createPoolGauges(getMetrics().registry, getPool);
  registered = true;
}

module.exports = {
  createPoolGauges,
  instrumentSequelizePool,
};
