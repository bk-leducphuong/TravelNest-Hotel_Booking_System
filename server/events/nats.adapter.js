const { connect, StringCodec } = require('nats');

const logger = require('@config/logger.config');
const { INTEGRATION_TOPICS } = require('@platform/events');

const sc = StringCodec();

const DEFAULT_STREAM = process.env.NATS_STREAM || 'TRAVELNEST_ANALYTICS';
const ANALYTICS_SUBJECTS = ['analytics.>'];
const DOMAIN_SUBJECTS = ['booking.>', 'payment.>', 'notification.>'];
const STREAM_SUBJECTS = {
  TRAVELNEST_ANALYTICS: ANALYTICS_SUBJECTS,
  TRAVELNEST_MEDIA: ['media.>'],
  TRAVELNEST_EVENTS: DOMAIN_SUBJECTS,
};

/**
 * NATS transport adapter.
 *
 * The one place that knows about NATS. It implements the EventPublisher
 * transport contract (`handles` + `publish`) and is registered with
 * `@platform/events` at the process composition root; nothing else imports it.
 *
 * Owns the JetStream connection, the stream/subject topology and the envelope
 * encoding. Integration topics are already NATS subjects, so `topic === subject`.
 * Also handles inbound NATS subscriptions, so it is the single NATS entry point
 * in both directions.
 */
class NatsTransport {
  constructor() {
    this.name = 'nats';
    this.connection = null;
    this.jetstream = null;
    this.connecting = null;
  }

  /** Only integration (cross-service) topics are published to NATS. */
  handles(topic) {
    return INTEGRATION_TOPICS.has(topic);
  }

  async connect() {
    if (this.jetstream) return this.jetstream;
    if (this.connecting) return this.connecting;

    this.connecting = this._connect();
    try {
      return await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  async _connect() {
    try {
      this.connection = await connect({
        servers: process.env.NATS_URL || 'nats://localhost:4222',
        name: process.env.NATS_CLIENT_NAME || 'travelnest-api',
      });
      this.jetstream = this.connection.jetstream();
      await this.ensureStreams();

      this.connection
        .closed()
        .then((err) => {
          if (err) logger.error({ error: err.message }, 'NATS connection closed with error');
          this.connection = null;
          this.jetstream = null;
          return null;
        })
        .catch((error) => {
          logger.error({ error: error.message }, 'Failed while closing NATS connection');
        });

      logger.info('NATS transport connected');
      return this.jetstream;
    } catch (error) {
      logger.warn({ error: error.message }, 'NATS transport unavailable');
      this.connection = null;
      this.jetstream = null;
      return null;
    }
  }

  async ensureStream(streamName, subjects) {
    const manager = await this.connection.jetstreamManager();
    try {
      await manager.streams.info(streamName);
    } catch (error) {
      await manager.streams.add({
        name: streamName,
        subjects,
        storage: 'file',
      });
    }
  }

  async ensureStreams() {
    const streams = new Map(Object.entries(STREAM_SUBJECTS));
    if (!streams.has(DEFAULT_STREAM)) {
      streams.set(DEFAULT_STREAM, ANALYTICS_SUBJECTS);
    }

    for (const [streamName, subjects] of streams.entries()) {
      await this.ensureStream(streamName, subjects);
    }
  }

  /**
   * Subscribe to an inbound NATS subject (core NATS, fire-and-forget). The
   * handler receives the decoded JSON envelope.
   *
   * @param {string} subject
   * @param {(envelope: object, message: object) => void} handler
   * @returns {Promise<object|null>} the NATS subscription, or null if unavailable
   */
  async subscribe(subject, handler) {
    await this.connect();
    if (!this.connection) {
      logger.warn({ subject }, 'NATS transport unavailable; inbound subscription skipped');
      return null;
    }

    const subscription = this.connection.subscribe(subject);

    (async () => {
      for await (const message of subscription) {
        try {
          handler(JSON.parse(sc.decode(message.data)), message);
        } catch (error) {
          logger.error({ error: error.message, subject }, 'Failed to handle NATS message');
        }
      }
    })().catch((error) => {
      logger.error({ error: error.message, subject }, 'NATS subscription loop failed');
    });

    logger.info({ subject }, 'NATS inbound subscription started');
    return subscription;
  }

  /**
   * @param {string} topic - Integration topic (=== NATS subject).
   * @param {object} envelope - Pre-built event envelope.
   * @returns {Promise<{eventId: string, stream: string, seq: number}|null>}
   */
  async publish(topic, envelope) {
    const js = await this.connect();
    if (!js) return null;

    try {
      const ack = await js.publish(topic, sc.encode(JSON.stringify(envelope)), {
        msgID: envelope.eventId,
      });
      return { eventId: envelope.eventId, stream: ack.stream, seq: Number(ack.seq) };
    } catch (error) {
      logger.warn(
        { error: error.message, subject: topic, eventId: envelope.eventId },
        'Failed to publish NATS event'
      );
      return null;
    }
  }

  async close() {
    if (!this.connection) return;
    await this.connection.drain();
  }
}

module.exports = new NatsTransport();
