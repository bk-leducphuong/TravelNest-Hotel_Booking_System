const ApiError = require('@utils/ApiError');

const connectedAccountRepository = require('../../infrastructure/connected-account.repository');
const { resolveConnectedAccountScope } = require('./connected-account-scope');

/**
 * List Stripe Connect accounts for a hotel or an owner.
 *
 * The caller's hotel context is authoritative for non-platform-staff: a
 * foreign `hotelId`/`ownerId` is rejected instead of leaking another owner's
 * payout account.
 */
async function listConnectedAccounts({
  hotelId,
  ownerId,
  actorUserId,
  actorHotelId,
  isPlatformStaff,
} = {}) {
  const scope = await resolveConnectedAccountScope({
    hotelId,
    ownerId,
    actorUserId,
    actorHotelId,
    isPlatformStaff,
  });

  if (scope.hotelId) {
    return await connectedAccountRepository.findForHotel(scope.hotelId);
  }
  if (scope.ownerId) {
    return await connectedAccountRepository.findForOwner(scope.ownerId);
  }

  throw new ApiError(400, 'MISSING_FILTER', 'Provide hotelId or ownerId');
}

module.exports = { listConnectedAccounts };
