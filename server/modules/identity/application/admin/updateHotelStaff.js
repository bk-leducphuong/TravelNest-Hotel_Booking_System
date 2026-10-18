const ApiError = require('@utils/ApiError');
const { ROLES } = require('@constants/roles');
const { auditService } = require('@platform/audit');

const authRepository = require('../../infrastructure/auth.repository');
const hotelMembershipRepository = require('../../infrastructure/hotel-membership.repository');

/** Change a member's hotel role. Never demote the last remaining owner. */
async function updateHotelStaff(hotelId, userId, { role }, { actorUserId, requestId } = {}) {
  const membership = await hotelMembershipRepository.findByHotelAndUserWithRole(userId, hotelId);

  if (!membership) {
    throw new ApiError(404, 'HOTEL_STAFF_NOT_FOUND', 'Staff member not found for this hotel');
  }

  const roleRecord = await authRepository.findRoleByName(role);
  if (!roleRecord) {
    throw new ApiError(500, 'ROLE_NOT_PROVISIONED', `Role '${role}' is not provisioned`);
  }

  const currentRole = membership.role?.name ?? null;

  if (currentRole === ROLES.OWNER && role !== ROLES.OWNER) {
    const owners = await hotelMembershipRepository.countByHotelRoleNames(hotelId, [ROLES.OWNER]);
    if (owners <= 1) {
      throw new ApiError(409, 'LAST_OWNER', 'Cannot change the role of the last owner.');
    }
  }

  await hotelMembershipRepository.upsertHotelRole({
    userId,
    hotelId,
    roleId: roleRecord.id,
    isPrimaryOwner: Boolean(membership.is_primary_owner),
  });

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'hotel.staff_updated',
    entityType: 'hotel_user',
    entityId: membership.id,
    hotelId,
    before: { role: currentRole },
    after: { role },
    requestId,
  });

  return {
    staff: {
      id: membership.id,
      userId,
      hotelId,
      role,
      isPrimaryOwner: Boolean(membership.is_primary_owner),
    },
  };
}

module.exports = { updateHotelStaff };
