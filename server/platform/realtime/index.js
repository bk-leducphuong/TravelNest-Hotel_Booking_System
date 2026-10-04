const {
  initSocket,
  getIO,
  getNamespace,
  emitToNamespace,
  emitToUser,
  emitToHotel,
  getSocketStats,
} = require('./server');
const userNamespace = require('./namespaces/user');

/**
 * Realtime platform component - public interface.
 *
 * Cross-cutting Socket.IO transport for the API. Owns the server bootstrap, the
 * namespace auth, and the per-audience namespaces (/public, /user, /property,
 * /support, /admin). Domain modules emit through this API rather than importing
 * namespaces directly.
 */

/** Emit a hold-expired event to a user's room (used by the hold expiry flow). */
function sendHoldExpired(userId, payload) {
  userNamespace.sendHoldExpired(getNamespace('/user'), userId, payload);
}

module.exports = {
  initSocket,
  getIO,
  getNamespace,
  emitToNamespace,
  emitToUser,
  emitToHotel,
  getSocketStats,
  sendHoldExpired,
};
