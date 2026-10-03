const webhookEventLogRepository = require('./webhook_event_log.repository');

/**
 * Webhook event log facade used by the Stripe webhook edge (idempotency +
 * audit trail) and re-exported by the payment module's public interface.
 */
module.exports = {
  findByEventId: (eventId) => webhookEventLogRepository.findByEventId(eventId),
  create: (data) => webhookEventLogRepository.create(data),
  updateStatus: (eventId, status, errorMessage) =>
    webhookEventLogRepository.updateStatus(eventId, status, errorMessage),
};
