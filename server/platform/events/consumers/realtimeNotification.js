const logger = require('@config/logger.config');
const { getNamespace } = require('@platform/realtime');

/**
 * Inbound consumer for `notification.realtime.dispatch.v1`.
 *
 * Decodes a dispatch envelope and forwards each target to its socket room. The
 * transport (NATS) is wired to this handler at the composition root.
 */
function handleRealtimeNotification(envelope) {
  const payload = envelope?.payload;

  if (!payload?.notification || !Array.isArray(payload.targets) || payload.targets.length === 0) {
    logger.warn({ payload }, 'Skipping invalid notification realtime payload');
    return;
  }

  for (const target of payload.targets) {
    if (!target?.namespace || !target?.room || !target?.event) {
      logger.warn({ target, eventId: envelope?.eventId }, 'Skipping invalid notification target');
      continue;
    }

    const namespace = getNamespace(target.namespace);
    namespace.to(target.room).emit(target.event, payload.notification);
    namespace.to(target.room).emit('notifications:unreadCountUpdate', {
      count: payload.unreadCount,
    });

    logger.info(
      {
        eventId: envelope?.eventId,
        notificationId: payload.notification.id,
        namespace: target.namespace,
        room: target.room,
        event: target.event,
        unreadCount: payload.unreadCount,
      },
      'Forwarded realtime notification to socket room'
    );
  }
}

module.exports = { handleRealtimeNotification };
