const { handleConnection } = require('./connection');
const { broadcastSystemAlert, sendMetricsUpdate, sendLogEntry } = require('./notifications');

/**
 * Admin Namespace Controller (/admin) - public interface.
 *
 * Handles connections from platform administrators.
 */
module.exports = {
  handleConnection,
  broadcastSystemAlert,
  sendMetricsUpdate,
  sendLogEntry,
};
