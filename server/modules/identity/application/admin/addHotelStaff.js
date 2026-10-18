const ApiError = require('@utils/ApiError');
const { auditService } = require('@platform/audit');

const authRepository = require('../../infrastructure/auth.repository');
const userRepository = require('../../infrastructure/user.repository');
const hotelMembershipRepository = require('../../infrastructure/hotel-membership.repository');

/**
 * Add an *existing* user (by email) to a hotel with a hotel-scoped role.
 * Phase 2a: the user must already have an account.
 */
async function addHotelStaff(hotelId, { email, role }, { actorUserId, requestId } = {}) {
  const roleRecord = await authRepository.findRoleByName(role);
  if (!roleRecord) {
    throw new ApiError(500, 'ROLE_NOT_PROVISIONED', `Role '${role}' is not provisioned`);
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new ApiError(
      404,
      'USER_NOT_FOUND',
      'No account exists for that email. The user must sign up before being added.'
    );
  }

  const membership = await hotelMembershipRepository.upsertHotelRole({
    userId: user.id,
    hotelId,
    roleId: roleRecord.id,
    isPrimaryOwner: false,
  });

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'hotel.staff_added',
    entityType: 'hotel_user',
    entityId: membership.id,
    hotelId,
    after: { userId: user.id, role },
    requestId,
  });

  return {
    staff: {
      id: membership.id,
      userId: user.id,
      hotelId,
      role,
      isPrimaryOwner: false,
      email: user.email,
    },
  };
}

module.exports = { addHotelStaff };
