/* eslint-disable no-console */
const { MySqlContainer } = require('@testcontainers/mysql');
const { RedisContainer } = require('@testcontainers/redis');

let startedContainers = null;

async function startTestContainers() {
  if (startedContainers) {
    return startedContainers;
  }

  console.log('Starting Testcontainers environment for integration tests...');

  // MySQL
  const mysql = await new MySqlContainer('mysql:8.0')
    .withDatabase('travelnest_test')
    .withUsername('testuser')
    .withUserPassword('testpass')
    .start();

  process.env.DB_NAME = mysql.getDatabase();
  process.env.DB_USER = mysql.getUsername();
  process.env.DB_PASSWORD = mysql.getUserPassword();
  process.env.DB_HOST = mysql.getHost();
  process.env.DB_PORT = String(mysql.getPort());

  console.log(
    `MySQL started at ${process.env.DB_HOST}:${process.env.DB_PORT} / ${process.env.DB_NAME}`
  );

  // Redis
  const redis = await new RedisContainer('redis:7-alpine').start();
  process.env.REDIS_HOST = redis.getHost();
  process.env.REDIS_PORT = String(redis.getPort());
  process.env.REDIS_USERNAME = '';
  process.env.REDIS_PASSWORD = '';
  process.env.REDIS_DATABASE = '1';

  console.log(
    `Redis started at ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
  );

  // Session secret for express-session
  process.env.SESSION_SECRET_KEY =
    process.env.SESSION_SECRET_KEY || 'test-session-secret';

  // Initialize database schema using Sequelize models
  const db = require('../../../models');
  console.log('Initializing database schema (sequelize.sync)...');
  await db.sequelize.sync({ alter: false, force: false });
  console.log('Database schema initialized');

  startedContainers = { mysql, redis };
  return startedContainers;
}

async function stopTestContainers() {
  if (!startedContainers) {
    return;
  }

  console.log('Stopping Testcontainers environment for integration tests...');
  const { mysql, redis } = startedContainers;
  const toStop = [mysql, redis].filter(Boolean);
  await Promise.all(toStop.map((c) => c.stop()));
  console.log('Testcontainers environment stopped');

  startedContainers = null;
}

module.exports = {
  startTestContainers,
  stopTestContainers,
};
