const eventBus = require('./event-bus');

const DOMAIN_EVENTS = {
  REVIEW_CREATED: 'review.created',
  REVIEW_PUBLISHED: 'review.published',
  REVIEW_HIDDEN: 'review.hidden',
  REVIEW_DELETED: 'review.deleted',
  REVIEW_REPLIED: 'review.replied',
  REVIEW_STATUS_CHANGED: 'review.status_changed',
  INVENTORY_CHANGED: 'inventory.changed',
  PAYMENT_REFUND_CREATED: 'payment.refund_created',
  PAYMENT_REFUND_SUCCEEDED: 'payment.refund_succeeded',
  PAYMENT_REFUND_FAILED: 'payment.refund_failed',
  BOOKING_STATUS_CHANGED: 'booking.status_changed',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_COMPLETED: 'booking.completed',
  PAYOUT_BATCH_GENERATED: 'payout.batch_generated',
  PAYOUT_PAID: 'payout.paid',
  PAYOUT_FAILED: 'payout.failed',
};

module.exports = {
  eventBus,
  DOMAIN_EVENTS,
};
