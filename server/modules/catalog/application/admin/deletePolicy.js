const ApiError = require('@utils/ApiError');
const { auditService } = require('@platform/audit');

const hotelRepository = require('../../infrastructure/hotel.repository');

/**
 * Soft-delete a hotel policy (mark inactive). Scoped to the hotel. Audited.
 */
async function deletePolicy(hotelId, policyId, { actorUserId, requestId } = {}) {
  const existing = await hotelRepository.findPolicyByIdAndHotelId(policyId, hotelId);

  if (!existing) {
    throw new ApiError(404, 'POLICY_NOT_FOUND', 'Policy not found');
  }

  await hotelRepository.deactivatePolicy(policyId);

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'policy.deleted',
    entityType: 'hotel_policy',
    entityId: policyId,
    hotelId,
    before: existing.toJSON ? existing.toJSON() : existing,
    after: { is_active: false },
    requestId,
  });

  return { policyId, hotelId };
}

module.exports = { deletePolicy };
