const ApiError = require('@utils/ApiError');
const { ROLES } = require('@constants/roles');
const { auditService } = require('@platform/audit');

const hotelMembershipRepository = require('../../infrastructure/hotel-membership.repository');

/** Remove a member from a hotel. Never remove the last remaining owner. */
async function removeHotelStaff(hotelId, userId, { actorUserId, requestId } = {}) {
  const membership = await hotelMembershipRepository.findByHotelAndUserWithRole(userId, hotelId);

  if (!membership) {
    throw new ApiError(404, 'HOTEL_STAFF_NOT_FOUND', 'Staff member not found for this hotel');
  }

  if (membership.role?.name === ROLES.OWNER) {
    const owners = await hotelMembershipRepository.countByHotelRoleNames(hotelId, [ROLES.OWNER]);
    if (owners <= 1) {
      throw new ApiError(409, 'LAST_OWNER', 'Cannot remove the last owner of the hotel.');
    }
  }

  await hotelMembershipRepository.removeHotelRole(userId, hotelId);

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'hotel.staff_removed',
    entityType: 'hotel_user',
    entityId: membership.id,
    hotelId,
    before: { userId, role: membership.role?.name ?? null },
    requestId,
  });

  return { id: membership.id, userId, deleted: true };
}

module.exports = { removeHotelStaff };
