const { connect, StringCodec } = require('nats');

const logger = require('@config/logger.config');
const { getNamespace } = require('@socket/index');

const sc = StringCodec();
const SUBJECT = 'notification.realtime.dispatch.v1';

let connection;
let subscription;

async function startNotificationRealtimeSubscriber() {
  if (subscription) {
    return subscription;
  }

  connection = await connect({
    servers: process.env.NATS_URL || 'nats://localhost:4222',
    name: process.env.NATS_REALTIME_CLIENT_NAME || 'travelnest-realtime-bridge',
  });

  connection.closed().catch((error) => {
    logger.error({ error: error?.message }, 'Notification realtime subscriber connection closed');
  });

  subscription = connection.subscribe(SUBJECT);
  logger.info('Notification realtime subscriber started', { subject: SUBJECT });

  (async () => {
    for await (const msg of subscription) {
      try {
        const envelope = JSON.parse(sc.decode(msg.data));
        const payload = envelope?.payload;
        if (
          !payload?.notification ||
          !Array.isArray(payload.targets) ||
          payload.targets.length === 0
        ) {
          logger.warn({ payload }, 'Skipping invalid notification realtime payload');
          continue;
        }

        for (const target of payload.targets) {
          if (!target?.namespace || !target?.room || !target?.event) {
            logger.warn(
              { target, eventId: envelope?.eventId },
              'Skipping invalid notification target'
            );
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
      } catch (error) {
        logger.error(
          {
            error: error.message,
            subject: SUBJECT,
          },
          'Failed to handle notification realtime dispatch'
        );
      }
    }
  })().catch((error) => {
    logger.error(
      { error: error.message, subject: SUBJECT },
      'Notification realtime subscriber loop failed'
    );
  });

  return subscription;
}

async function stopNotificationRealtimeSubscriber() {
  if (subscription) {
    subscription.unsubscribe();
    subscription = null;
  }
  if (connection) {
    await connection.drain();
    connection = null;
  }
}

module.exports = {
  startNotificationRealtimeSubscriber,
  stopNotificationRealtimeSubscriber,
};
