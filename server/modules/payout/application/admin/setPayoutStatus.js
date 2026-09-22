const ApiError = require('@utils/ApiError');
const { auditService } = require('@platform/audit');

const payoutRepository = require('../../infrastructure/payout.repository');
const payoutService = require('../payout.service');
const { assertTransition } = require('../../domain/payout-rules');

/**
 * Manual payout status override (e.g. mark a stuck payout failed/cancelled, or
 * reconcile a paid payout from a provider report).
 */
async function setPayoutStatus(
  payoutId,
  { status, failureCode, failureMessage, actorUserId, requestId } = {}
) {
  const payout = await payoutRepository.findById(payoutId);

  if (!payout) {
    throw new ApiError(404, 'PAYOUT_NOT_FOUND', 'Payout not found');
  }

  const previousStatus = payout.status;
  assertTransition(previousStatus, status);

  const updated = await payoutService.markPayoutStatus(payoutId, status, {
    failureCode,
    failureMessage,
  });

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'payout.status_changed',
    entityType: 'payout',
    entityId: payoutId,
    hotelId: payout.hotel_id,
    before: { status: previousStatus },
    after: { status },
    requestId,
  });

  return updated;
}

module.exports = { setPayoutStatus };
