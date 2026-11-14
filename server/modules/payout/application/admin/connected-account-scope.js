const ApiError = require('@utils/ApiError');
const { HotelUsers, Roles } = require('@platform/database');
const { ROLES } = require('@constants/roles');

/**
 * Connected-account authorization helpers.
 *
 * Payout accounts move real money, so a hotel-scoped caller may only see or
 * create accounts for owners who actually own a hotel they belong to. Platform
 * staff keep the global view.
 */

const ownerRoleWhere = {
  model: Roles,
  as: 'role',
  where: { name: ROLES.OWNER },
  required: true,
};

async function findOwnerMembership(ownerId, hotelId) {
  const where = { user_id: ownerId };
  if (hotelId) where.hotel_id = hotelId;

  return HotelUsers.findOne({
    where,
    include: [ownerRoleWhere],
    attributes: ['id', 'hotel_id', 'user_id', 'is_primary_owner'],
  });
}

async function assertOwnerBelongsToHotel(ownerId, hotelId) {
  const membership = await findOwnerMembership(ownerId, hotelId);
  if (!membership) {
    throw new ApiError(403, 'OWNER_NOT_IN_HOTEL', 'The requested owner does not own this hotel.');
  }
  return membership;
}

async function assertUserIsOwner(ownerId) {
  const membership = await findOwnerMembership(ownerId);
  if (!membership) {
    throw new ApiError(403, 'OWNER_ROLE_REQUIRED', 'The requested user is not a hotel owner.');
  }
  return membership;
}

/**
 * Validate and normalize `hotelId`/`ownerId` filters for list/check reads.
 */
async function resolveConnectedAccountScope({
  hotelId,
  ownerId,
  actorUserId,
  actorHotelId,
  isPlatformStaff,
}) {
  if (isPlatformStaff) {
    if (ownerId) await assertUserIsOwner(ownerId);
    if (hotelId && ownerId) await assertOwnerBelongsToHotel(ownerId, hotelId);
    return { hotelId: hotelId || null, ownerId: ownerId || null };
  }

  const scopedHotelId = actorHotelId || null;

  if (hotelId && String(hotelId) !== String(scopedHotelId)) {
    throw new ApiError(403, 'RESOURCE_ACCESS_DENIED', 'You do not have access to this hotel.');
  }

  if (ownerId) {
    if (scopedHotelId) {
      await assertOwnerBelongsToHotel(ownerId, scopedHotelId);
    } else if (String(ownerId) !== String(actorUserId)) {
      throw new ApiError(403, 'OWNER_SCOPE_DENIED', 'You cannot access this owner.');
    }
  }

  return { hotelId: scopedHotelId, ownerId: ownerId || null };
}

/**
 * Validate and normalize the payload for creating a connected account.
 * Returns the effective hotel id (null for an owner-level account).
 */
async function resolveCreateConnectedAccountScope({
  hotelId,
  ownerId,
  actorUserId,
  actorHotelId,
  isPlatformStaff,
}) {
  if (!ownerId) {
    throw new ApiError(400, 'MISSING_OWNER', 'ownerId is required to create a connect account');
  }

  if (isPlatformStaff) {
    if (hotelId) {
      await assertOwnerBelongsToHotel(ownerId, hotelId);
    } else {
      await assertUserIsOwner(ownerId);
    }
    return { hotelId: hotelId || null };
  }

  const scopedHotelId = actorHotelId || null;

  if (hotelId && String(hotelId) !== String(scopedHotelId)) {
    throw new ApiError(403, 'RESOURCE_ACCESS_DENIED', 'You do not have access to this hotel.');
  }

  if (scopedHotelId) {
    await assertOwnerBelongsToHotel(ownerId, scopedHotelId);
  } else if (String(ownerId) !== String(actorUserId)) {
    throw new ApiError(403, 'OWNER_SCOPE_DENIED', 'You cannot create an account for this owner.');
  } else {
    await assertUserIsOwner(ownerId);
  }

  return { hotelId: scopedHotelId };
}

module.exports = {
  assertOwnerBelongsToHotel,
  assertUserIsOwner,
  resolveConnectedAccountScope,
  resolveCreateConnectedAccountScope,
};
