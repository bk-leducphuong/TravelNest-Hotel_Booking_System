const ApiError = require('@utils/ApiError');

const connectedAccountRepository = require('../../infrastructure/connected-account.repository');
const { isStripeConfigured } = require('../../infrastructure/stripe-client');
const { isAccountPayoutReady } = require('../../domain/payout-rules');

/**
 * Report whether a hotel/owner has a payout-ready connected account.
 */
async function checkConnectedAccount({ hotelId, ownerId } = {}) {
  if (!hotelId && !ownerId) {
    throw new ApiError(400, 'MISSING_FILTER', 'Provide hotelId or ownerId');
  }

  const account = await connectedAccountRepository.findExisting({ hotelId, ownerId });

  return {
    configured: isStripeConfigured(),
    hasAccount: Boolean(account),
    payoutReady: isAccountPayoutReady(account),
    account: account || null,
  };
}

module.exports = { checkConnectedAccount };
