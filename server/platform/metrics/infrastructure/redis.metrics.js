const { getMetrics } = require('./registry');

/**
 * Redis commands this application actually issues. Anything else collapses to
 * `other` so a future library call cannot silently add unbounded labels.
 */
const KNOWN_COMMANDS = new Set([
  'get',
  'set',
  'setex',
  'mget',
  'mset',
  'del',
  'exists',
  'expire',
  'ttl',
  'incr',
  'decr',
  'hget',
  'hset',
  'hgetall',
  'hdel',
  'hmget',
  'lpush',
  'rpush',
  'lpop',
  'rpop',
  'lrange',
  'sadd',
  'srem',
  'smembers',
  'sismember',
  'zadd',
  'zrem',
  'zrange',
  'zscore',
  'scan',
  'keys',
  'eval',
  'evalsha',
  'publish',
  'subscribe',
  'unsubscribe',
  'ping',
  'info',
]);

function normalizeCommand(args) {
  const raw = Array.isArray(args) ? args[0] : null;
  if (typeof raw !== 'string') {
    return 'other';
  }

  const command = raw.toLowerCase();
  return KNOWN_COMMANDS.has(command) ? command : 'other';
}

/**
 * Time every command sent through a node-redis client.
 *
 * node-redis has no per-command duration event, so `sendCommand` is the only
 * single choke point available. The wrapper is idempotent.
 *
 * @param {object} client node-redis client
 * @returns {object} the same client
 */
function instrumentRedisClient(client) {
  if (
    !client ||
    typeof client.sendCommand !== 'function' ||
    client.__travelnestMetricsInstrumented
  ) {
    return client;
  }

  const originalSendCommand = client.sendCommand.bind(client);

  client.sendCommand = async function sendCommandWithMetrics(args, options) {
    const start = process.hrtime.bigint();

    try {
      return await originalSendCommand(args, options);
    } finally {
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      getMetrics().redisDuration.observe({ command: normalizeCommand(args) }, seconds);
    }
  };

  client.__travelnestMetricsInstrumented = true;

  return client;
}

module.exports = {
  KNOWN_COMMANDS,
  instrumentRedisClient,
  normalizeCommand,
};
