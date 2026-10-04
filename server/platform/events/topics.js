/**
 * Event topic catalog.
 *
 * Three groups, by delivery:
 *   - INTEGRATION_EVENTS: cross-process events delivered by a transport adapter.
 *     The value IS the NATS subject; the Go services depend on these exact
 *     strings, so treat them as a stable wire contract.
 *   - INBOUND_EVENTS: subjects we consume from another service.
 *   - HOLD_EVENTS: socket-fanout events delivered by the redis-hold transport.
 *
 * In-process domain events live in `DOMAIN_EVENTS` (index.js) and are never
 * routed to a transport.
 */
const INTEGRATION_EVENTS = {
  EMAIL_REQUESTED: 'notification.email.requested.v1',
  IN_APP_REQUESTED: 'notification.test.inapp.requested.v1',
  PAYMENT_SUCCEEDED: 'payment.payment.succeeded.v1',
  REFUND_CREATED: 'payment.refund.created.v1',
  PAYOUT_COMPLETED: 'payment.payout.completed.v1',
  PAYOUT_FAILED: 'payment.payout.failed.v1',
  BOOKING_EXPIRED: 'booking.booking.expired.v1',
  SEARCH_PERFORMED: 'analytics.search.performed.v1',
  HOTEL_VIEWED: 'analytics.hotel.viewed.v1',
};

/** Fast lookup for the NATS adapter deciding whether it owns a topic. */
const INTEGRATION_TOPICS = new Set(Object.values(INTEGRATION_EVENTS));

const INBOUND_EVENTS = {
  REALTIME_DISPATCH: 'notification.realtime.dispatch.v1',
};

const HOLD_EVENTS = {
  HOLD_EXPIRED: 'hold.expired',
};

module.exports = { INTEGRATION_EVENTS, INTEGRATION_TOPICS, INBOUND_EVENTS, HOLD_EVENTS };
