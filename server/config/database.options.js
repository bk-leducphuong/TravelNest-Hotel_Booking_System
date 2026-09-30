const path = require('path');

const { Sequelize } = require('sequelize');

const nodeEnv = process.env.NODE_ENV || 'development';

// Load the environment file once for every consumer (app runtime and sequelize-cli).
// dotenv does not override variables already present in process.env, which is what
// tests and CI rely on.
require('dotenv').config({
  path: path.resolve(__dirname, '..', `.env.${nodeEnv}`),
});

const DEFAULT_DATABASE = 'travelnest';

// Single definition of the connection pool. Previously the runtime config used
// max:10 while sequelize-cli used max:5, which is exactly the kind of drift this
// module exists to prevent.
const DEFAULT_POOL = Object.freeze({
  max: 10,
  min: 0,
  acquire: 60000,
  idle: 60000,
  evict: 10000,
});

const DEFAULT_RETRY = Object.freeze({
  max: 3,
  match: [
    /EPIPE/,
    /ECONNRESET/,
    /ETIMEDOUT/,
    /EHOSTUNREACH/,
    /ENETUNREACH/,
    /SequelizeConnectionError/,
  ],
});

function resolveDatabase(override) {
  return override || process.env.DB_NAME || DEFAULT_DATABASE;
}

/**
 * Plain connection fields shared by the app runtime and sequelize-cli.
 * @param {{ database?: string }} [overrides]
 */
function getConnectionConfig({ database } = {}) {
  return {
    username: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || '123',
    database: resolveDatabase(database),
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    dialect: 'mysql',
  };
}

function getPool(overrides) {
  return { ...DEFAULT_POOL, ...(overrides || {}) };
}

function getLogging(override) {
  if (override !== undefined) {
    return override;
  }
  return process.env.DB_LOGGING === 'true' ? console.log : false;
}

/**
 * Build a Sequelize instance. This is the single runtime definition used by
 * `config/database.config.js` and therefore by every model/repository.
 * @param {{ database?: string, pool?: object, logging?: boolean|Function, retry?: object }} [overrides]
 */
function createSequelize(overrides = {}) {
  const connection = getConnectionConfig(overrides);

  return new Sequelize(connection.database, connection.username, connection.password, {
    host: connection.host,
    port: connection.port,
    dialect: connection.dialect,
    logging: getLogging(overrides.logging),
    pool: getPool(overrides.pool),
    retry: { ...DEFAULT_RETRY, ...(overrides.retry || {}) },
  });
}

/**
 * sequelize-cli configuration. Kept in lock-step with createSequelize() so the
 * CLI can never target a different host/database/pool than the application.
 */
function getCliConfig() {
  const base = getConnectionConfig();
  const pool = getPool();

  return {
    development: { ...base, logging: getLogging(), pool },
    test: {
      ...base,
      database: process.env.DB_NAME ? `${process.env.DB_NAME}_test` : 'travelnest_test',
      logging: false,
      pool,
    },
    production: { ...base, logging: getLogging(), pool },
  };
}

module.exports = {
  DEFAULT_POOL,
  DEFAULT_RETRY,
  createSequelize,
  getCliConfig,
  getConnectionConfig,
  getLogging,
  getPool,
  nodeEnv,
};
