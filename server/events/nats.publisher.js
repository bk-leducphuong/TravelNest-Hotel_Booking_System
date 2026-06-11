const { connect, StringCodec } = require('nats');
const { v4: uuidv4 } = require('uuid');
const logger = require('@config/logger.config');

const sc = StringCodec();
const DEFAULT_STREAM = process.env.NATS_STREAM || 'TRAVELNEST_ANALYTICS';
const ANALYTICS_SUBJECTS = ['analytics.>'];
const DOMAIN_SUBJECTS = ['booking.>', 'payment.>', 'notification.>'];
const STREAM_SUBJECTS = {
  TRAVELNEST_ANALYTICS: ANALYTICS_SUBJECTS,
  TRAVELNEST_MEDIA: ['media.>'],
  TRAVELNEST_EVENTS: DOMAIN_SUBJECTS,
};

class NatsPublisher {
  constructor() {
    this.connection = null;
    this.jetstream = null;
    this.connecting = null;
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

      logger.info('NATS publisher connected');
      return this.jetstream;
    } catch (error) {
      logger.warn({ error: error.message }, 'NATS publisher unavailable');
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

  async publish(subject, payload, options = {}) {
    const js = await this.connect();
    if (!js) return null;

    const event = {
      eventId: options.eventId || uuidv4(),
      eventType: subject,
      version: options.version || 1,
      occurredAt: (options.occurredAt || new Date()).toISOString(),
      producer: options.producer || 'travelnest-api',
      correlationId: options.correlationId || null,
      idempotencyKey: options.idempotencyKey || null,
      payload,
    };

    try {
      const ack = await js.publish(subject, sc.encode(JSON.stringify(event)), {
        msgID: event.eventId,
      });
      return { eventId: event.eventId, stream: ack.stream, seq: Number(ack.seq) };
    } catch (error) {
      logger.warn(
        { error: error.message, subject, eventId: event.eventId },
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

module.exports = new NatsPublisher();
