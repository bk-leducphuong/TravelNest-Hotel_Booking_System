/**
 * Liveness probe: the process is running.
 */
function getLiveness() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}

module.exports = { getLiveness };
