/**
 * Formatting helpers for health checks (pure).
 */

/**
 * Format a byte count as a human-readable string.
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

/**
 * Normalize a `Promise.allSettled` result into a check result.
 */
function formatCheckResult(result) {
  if (result.status === 'fulfilled') {
    return result.value;
  }

  return {
    status: 'unhealthy',
    message: 'Health check failed',
    error: result.reason?.message || 'Unknown error',
  };
}

module.exports = { formatBytes, formatCheckResult };
