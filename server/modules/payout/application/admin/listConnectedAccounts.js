const ApiError = require('@utils/ApiError');

const connectedAccountRepository = require('../../infrastructure/connected-account.repository');

/**
 * List Stripe Connect accounts for a hotel or an owner.
 */
async function listConnectedAccounts({ hotelId, ownerId } = {}) {
  if (hotelId) {
    return await connectedAccountRepository.findForHotel(hotelId);
  }
  if (ownerId) {
    return await connectedAccountRepository.findForOwner(ownerId);
  }

  throw new ApiError(400, 'MISSING_FILTER', 'Provide hotelId or ownerId');
}

module.exports = { listConnectedAccounts };
