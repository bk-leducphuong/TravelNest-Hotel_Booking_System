const ApiError = require('@utils/ApiError');
const { auditService } = require('@platform/audit');

const hotelRepository = require('../../infrastructure/hotel.repository');

/** Delete a cancellation rule (scoped to the hotel). Audited. */
async function deleteCancellationRule(hotelId, ruleId, { actorUserId, requestId } = {}) {
  const existing = await hotelRepository.findCancellationRuleByIdAndHotelId(ruleId, hotelId);

  if (!existing) {
    throw new ApiError(404, 'CANCELLATION_RULE_NOT_FOUND', 'Cancellation rule not found');
  }

  await hotelRepository.deleteCancellationRule(ruleId);

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'cancellation_rule.deleted',
    entityType: 'hotel_cancellation_rule',
    entityId: ruleId,
    hotelId,
    before: existing.toJSON ? existing.toJSON() : existing,
    requestId,
  });

  return { id: ruleId, deleted: true };
}

module.exports = { deleteCancellationRule };
