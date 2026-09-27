const ApiError = require('@utils/ApiError');

const connectedAccountRepository = require('../../infrastructure/connected-account.repository');
const { getStripe } = require('../../infrastructure/stripe-client');

function defaultUrl(pathname) {
  const host = process.env.CLIENT_HOST || 'http://localhost:5173';
  return `${host}${pathname}`;
}

/**
 * Create (or refresh) a Stripe account onboarding link so the owner can finish
 * KYC. Returns the hosted onboarding URL.
 */
async function createAccountLink(
  { accountId, hotelId, ownerId, refreshUrl, returnUrl } = {},
  { actorUserId, requestId } = {}
) {
  let account = null;

  if (accountId) {
    account = await connectedAccountRepository.findById(accountId);
  } else {
    account = await connectedAccountRepository.findExisting({ hotelId, ownerId });
  }

  if (!account) {
    throw new ApiError(404, 'CONNECTED_ACCOUNT_NOT_FOUND', 'Connected account not found');
  }

  const stripe = getStripe();

  const link = await stripe.accountLinks.create({
    account: account.provider_account_id,
    refresh_url: refreshUrl || defaultUrl('/admin/payout/refresh'),
    return_url: returnUrl || defaultUrl('/admin/payout/return'),
    type: 'account_onboarding',
  });

  return {
    accountId: account.id,
    providerAccountId: account.provider_account_id,
    url: link.url,
    expiresAt: link.expires_at,
  };
}

module.exports = { createAccountLink };
