const { v4: uuidv4 } = require('uuid');

/**
 * Build the canonical event envelope shared by every transport adapter.
 *
 * The field names intentionally match the wire format the Go services already
 * consume (`eventId`, `eventType`, `version`, `occurredAt`, `producer`,
 * `correlationId`, `idempotencyKey`, `payload`) so moving a producer behind the
 * event port does not change what downstream consumers see.
 *
 * @param {string} topic - Logical event topic (for integration events this is
 *   also the NATS subject).
 * @param {object} payload - Event body.
 * @param {object} meta - Envelope overrides (eventId, occurredAt, ...).
 * @returns {object} Envelope
 */
function buildEnvelope(topic, payload, meta = {}) {
  return {
    eventId: meta.eventId || uuidv4(),
    eventType: topic,
    version: meta.version || 1,
    occurredAt: toIsoString(meta.occurredAt || new Date()),
    producer: meta.producer || 'travelnest-api',
    correlationId: meta.correlationId || null,
    idempotencyKey: meta.idempotencyKey || null,
    payload,
  };
}

/** Accept either a Date or anything `new Date()` understands. */
function toIsoString(value) {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

module.exports = { buildEnvelope };
