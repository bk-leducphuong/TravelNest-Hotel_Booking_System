const logger = require('@config/logger.config');

/**
 * Outbound notifications to administrators (called from other modules).
 */

function broadcastSystemAlert(namespace, alertData) {
  namespace.to('administrators').emit('system:alert', alertData);
  logger.warn('Broadcasted system alert to admins', alertData);
}

function sendMetricsUpdate(namespace, metrics) {
  namespace.to('system_metrics').emit('system:metricsUpdate', metrics);
}

function sendLogEntry(namespace, logEntry) {
  namespace.to('system_logs').emit('logs:entry', logEntry);
}

module.exports = { broadcastSystemAlert, sendMetricsUpdate, sendLogEntry };
