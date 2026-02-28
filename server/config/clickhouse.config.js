require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

const { createClient } = require('@clickhouse/client');
const logger = require('./logger.config');

const DEFAULT_PORT = 8123;

/**
 * Normalize ClickHouse URL. Accepts either a full URL (http://host:8123) or a hostname (e.g. "clickhouse" in Docker).
 */
function normalizeClickHouseUrl(host, port) {
  const p = port || DEFAULT_PORT;
  if (!host) return `http://localhost:${DEFAULT_PORT}`;
  const trimmed = String(host).trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const scheme = process.env.CLICKHOUSE_USE_SSL === 'true' ? 'https' : 'http';
  return `${scheme}://${trimmed}:${p}`;
}

const clickhouseConnection = {
  host: normalizeClickHouseUrl(
    process.env.CLICKHOUSE_HOST,
    process.env.CLICKHOUSE_PORT ? parseInt(process.env.CLICKHOUSE_PORT, 10) : undefined
  ),
  database: process.env.CLICKHOUSE_DATABASE || 'travelnest',
  username: process.env.CLICKHOUSE_USERNAME || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
};

/**
 * ClickHouse client singleton
 */
let client = null;

const getClient = () => {
  if (!client) {
    client = createClient({
      url: clickhouseConnection.host,
      database: clickhouseConnection.database,
      username: clickhouseConnection.username,
      password: clickhouseConnection.password,
      request_timeout: 30000,
      max_open_connections: 10,
      compression: {
        request: true,
        response: true,
      },
    });

    logger.info('ClickHouse client initialized', {
      host: clickhouseConnection.host,
      database: clickhouseConnection.database,
    });
  }

  return client;
};

/**
 * Test connection
 */
const ping = async () => {
  try {
    const client = getClient();
    const result = await client.query({
      query: 'SELECT 1 as ping',
      format: 'JSONEachRow',
    });
    const data = await result.json();
    return data.length > 0 && data[0].ping === 1;
  } catch (error) {
    logger.error('ClickHouse ping failed', { error: error.message });
    return false;
  }
};

/**
 * Close connection (for graceful shutdown)
 */
const close = async () => {
  if (client) {
    await client.close();
    client = null;
    logger.info('ClickHouse client closed');
  }
};

module.exports = {
  getClient,
  ping,
  close,
};
