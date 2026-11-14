const { auditService } = require('@platform/audit');
const { publish, DOMAIN_EVENTS } = require('@platform/events');

const payoutService = require('../payout.service');
const settings = require('../payout-settings');

/**
 * Generate payout records for all eligible bookings (idempotent per booking via
 * the unique payout_items.booking_id).
 *
 * `hotelId` narrows generation to one hotel; it is mandatory for hotel-scoped
 * callers (enforced by the controller) so an owner cannot trigger a platform
 * wide payout run.
 */
async function generateEligiblePayouts({
  cutoffDate,
  ownerId,
  hotelId,
  actorUserId,
  requestId,
} = {}) {
  const result = await payoutService.createEligiblePayouts({
    cutoffDate: cutoffDate ? new Date(cutoffDate) : settings.getEligibilityCutoffDate(),
    ownerId,
    hotelId,
  });

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'payout.generated',
    entityType: 'payout_batch',
    entityId: null,
    hotelId: hotelId || null,
    after: { scanned: result.scanned, created: result.created },
    requestId,
  });

  await publish(DOMAIN_EVENTS.PAYOUT_BATCH_GENERATED, {
    scanned: result.scanned,
    created: result.created,
    hotelId: hotelId || null,
  });

  return result;
}

module.exports = { generateEligiblePayouts };
