const { auditService } = require('@platform/audit');
const { eventBus, DOMAIN_EVENTS } = require('@platform/events');

const payoutService = require('../payout.service');

/**
 * Generate payout records for all eligible bookings (idempotent per booking via
 * the unique payout_items.booking_id).
 */
async function generateEligiblePayouts({ cutoffDate, ownerId, actorUserId, requestId } = {}) {
  const result = await payoutService.createEligiblePayouts({
    cutoffDate: cutoffDate ? new Date(cutoffDate) : new Date(),
    ownerId,
  });

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'payout.generated',
    entityType: 'payout_batch',
    entityId: null,
    after: { scanned: result.scanned, created: result.created },
    requestId,
  });

  await eventBus.publish(DOMAIN_EVENTS.PAYOUT_BATCH_GENERATED, {
    scanned: result.scanned,
    created: result.created,
  });

  return result;
}

module.exports = { generateEligiblePayouts };
