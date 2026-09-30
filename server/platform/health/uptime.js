/**
 * Process uptime. Captured at module load, which matches the previous
 * per-process service instance.
 */
const START_TIME = Date.now();

function getUptime() {
  const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);
  const days = Math.floor(uptimeSeconds / 86400);
  const hours = Math.floor((uptimeSeconds % 86400) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;

  return {
    seconds: uptimeSeconds,
    formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`,
  };
}

module.exports = { getUptime };
