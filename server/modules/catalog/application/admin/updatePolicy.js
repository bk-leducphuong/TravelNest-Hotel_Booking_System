const ApiError = require('@utils/ApiError');
const { auditService } = require('@platform/audit');

const hotelRepository = require('../../infrastructure/hotel.repository');

/** Input field -> hotel_policies column. */
const EDITABLE_FIELDS = {
  policyType: 'policy_type',
  title: 'title',
  description: 'description',
  displayOrder: 'display_order',
  icon: 'icon',
  isActive: 'is_active',
};

/**
 * Update a hotel policy. Scoped to the hotel. Audited.
 */
async function updatePolicy(hotelId, policyId, payload = {}, { actorUserId, requestId } = {}) {
  const existing = await hotelRepository.findPolicyByIdAndHotelId(policyId, hotelId);

  if (!existing) {
    throw new ApiError(404, 'POLICY_NOT_FOUND', 'Policy not found');
  }

  const values = {};
  for (const [input, column] of Object.entries(EDITABLE_FIELDS)) {
    if (payload[input] !== undefined) {
      values[column] = payload[input];
    }
  }

  if (Object.keys(values).length === 0) {
    throw new ApiError(
      400,
      'NO_POLICY_CHANGES',
      `No editable fields provided (${Object.keys(EDITABLE_FIELDS).join(', ')})`
    );
  }

  await hotelRepository.updatePolicy(policyId, values);

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'policy.updated',
    entityType: 'hotel_policy',
    entityId: policyId,
    hotelId,
    before: existing.toJSON ? existing.toJSON() : existing,
    after: values,
    requestId,
  });

  const policy = await hotelRepository.findPolicyByIdAndHotelId(policyId, hotelId);
  return { policy };
}

module.exports = { updatePolicy, EDITABLE_FIELDS };
