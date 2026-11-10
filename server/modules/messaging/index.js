const guestRoutes = require('./api/guest.routes');
const adminRoutes = require('./api/admin.routes');
const { ensureConversationForBooking } = require('./application/ensureConversationForBooking');
const { resolveConversationAccess } = require('./application/access');
const { registerMessagingSubscribers } = require('./events/subscribers');

// Register once per process (guarded).
registerMessagingSubscribers();

/**
 * Messaging module - public interface.
 *
 * Guest <-> hotel threads, one per booking. Other modules must not import this
 * module's repositories or models directly.
 */
module.exports = {
  guestRoutes,
  adminRoutes,

  // Cross-module: booking flow may open a thread eagerly.
  ensureConversationForBooking,

  // Realtime: resolve which side (guest / hotel) a socket belongs to.
  resolveConversationAccess,
};
