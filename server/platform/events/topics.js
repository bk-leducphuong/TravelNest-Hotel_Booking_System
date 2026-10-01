/**
 * Integration events: the events that cross a process or service boundary and
 * are delivered by a registered transport adapter (NATS today).
 *
 * The value IS the NATS subject. The Go services depend on these exact strings,
 * so treat them as a stable wire contract. In-process domain events live in
 * `DOMAIN_EVENTS` instead and are never routed to a transport.
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

/** Fast lookup for transport adapters deciding whether they own a topic. */
const INTEGRATION_TOPICS = new Set(Object.values(INTEGRATION_EVENTS));

module.exports = { INTEGRATION_EVENTS, INTEGRATION_TOPICS };
