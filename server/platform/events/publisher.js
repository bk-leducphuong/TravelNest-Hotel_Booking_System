const logger = require('@config/logger.config');

const eventBus = require('./event-bus');
const { buildEnvelope } = require('./envelope');

/**
 * EventPublisher port.
 *
 * `publish` is the single entry point for emitting an event. It delivers to
 * in-process subscribers (the EventBus) and to every registered transport
 * adapter that claims the topic. Callers never import a transport directly.
 *
 * Transport adapter contract:
 *   {
 *     name: string,
 *     handles(topic): boolean,
 *     publish(topic, envelope): Promise<result|null>,
 *   }
 *
 * A failing adapter is isolated: it is logged and returns null, but never
 * breaks the publisher or the local delivery.
 */
const transports = [];

function registerTransport(transport) {
  if (
    !transport ||
    typeof transport.name !== 'string' ||
    typeof transport.handles !== 'function' ||
    typeof transport.publish !== 'function'
  ) {
    throw new Error('registerTransport requires a { name, handles, publish } transport adapter');
  }

  if (!transports.some((registered) => registered.name === transport.name)) {
    transports.push(transport);
  }

  return transport;
}

function getTransports() {
  return [...transports];
}

/** Testing helper - drop all registered transports. */
function resetTransports() {
  transports.length = 0;
}

async function publish(topic, payload = {}, meta = {}) {
  if (!topic) {
    throw new Error('event publish requires a topic');
  }

  const envelope = buildEnvelope(topic, payload, meta);

  // 1. In-process subscribers (awaited and isolated by the bus).
  const local = await eventBus.publish(topic, payload);

  // 2. Transport adapters that claim the topic.
  const claimed = transports.filter((transport) => transport.handles(topic));
  const responses = await Promise.all(
    claimed.map(async (transport) => {
      try {
        return { transport: transport.name, result: await transport.publish(topic, envelope) };
      } catch (error) {
        logger.error(
          { error: error.message, transport: transport.name, topic },
          'Event transport failed'
        );
        return { transport: transport.name, result: null, error: error.message };
      }
    })
  );

  return { eventId: envelope.eventId, envelope, local, responses };
}

/** Subscribe to an event topic (in-process delivery). */
function subscribe(topic, handler) {
  return eventBus.subscribe(topic, handler);
}

module.exports = { publish, subscribe, registerTransport, getTransports, resetTransports };
