const { createClient } = require('@clickhouse/client');
const config = require('./clickhouse.config');
const logger = require('./logger.config');

/**
 * ClickHouse client singleton
 */
let client = null;

const getClient = () => {
  if (!client) {
    client = createClient({
      url: config.host,
      database: config.database,
      username: config.username,
      password: config.password,
      request_timeout: 30000,
      max_open_connections: 10,
      compression: {
        request: true,
        response: true,
      },
    });

    logger.info('ClickHouse client initialized', {
      host: config.host,
      database: config.database,
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
