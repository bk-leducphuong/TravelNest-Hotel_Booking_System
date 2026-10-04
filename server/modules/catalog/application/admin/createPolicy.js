const ApiError = require('@utils/ApiError');
const { auditService } = require('@platform/audit');

const hotelRepository = require('../../infrastructure/hotel.repository');

/**
 * Create a hotel policy. Audited.
 */
async function createPolicy(hotelId, payload = {}, { actorUserId, requestId } = {}) {
  const hotel = await hotelRepository.findByIdForAdmin(hotelId);

  if (!hotel) {
    throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
  }

  const policy = await hotelRepository.createPolicy({
    hotelId,
    policyType: payload.policyType,
    title: payload.title,
    description: payload.description,
    displayOrder: payload.displayOrder,
    icon: payload.icon,
    isActive: payload.isActive,
  });

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'policy.created',
    entityType: 'hotel_policy',
    entityId: policy.id,
    hotelId,
    after: policy.toJSON ? policy.toJSON() : policy,
    requestId,
  });

  return { policy };
}

module.exports = { createPolicy };
