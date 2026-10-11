const ApiError = require('@utils/ApiError');

const connectedAccountRepository = require('../../infrastructure/connected-account.repository');

/**
 * Load a connected payment account by id (for ownership checks in the
 * back-office). The account carries `hotel_id`, which the caller compares
 * against the authorized hotel context.
 */
async function getConnectedAccount(accountId) {
  const account = await connectedAccountRepository.findById(accountId);

  if (!account) {
    throw new ApiError(404, 'CONNECTED_ACCOUNT_NOT_FOUND', 'Connected account not found');
  }

  return account;
}

module.exports = { getConnectedAccount };
