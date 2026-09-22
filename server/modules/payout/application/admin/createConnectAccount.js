const ApiError = require('@utils/ApiError');
const { auditService } = require('@platform/audit');

const connectedAccountRepository = require('../../infrastructure/connected-account.repository');
const { getStripe } = require('../../infrastructure/stripe-client');
const { deriveOnboardingStatus } = require('../../domain/payout-rules');

/**
 * Create a Stripe Connect account for an owner (optionally hotel-scoped) and
 * persist the local mirror.
 */
async function createConnectAccount(
  { hotelId, ownerId, email, country, accountType, isDefault } = {},
  { actorUserId, requestId } = {}
) {
  if (!ownerId) {
    throw new ApiError(400, 'MISSING_OWNER', 'ownerId is required to create a connect account');
  }

  const existing = await connectedAccountRepository.findExisting({ hotelId, ownerId });
  if (existing) {
    throw new ApiError(
      409,
      'CONNECTED_ACCOUNT_EXISTS',
      'A connected account already exists for this owner/hotel'
    );
  }

  const stripe = getStripe();

  const stripeAccount = await stripe.accounts.create({
    type: accountType || 'express',
    country,
    email,
    capabilities: { transfers: { requested: true } },
    metadata: {
      hotel_id: hotelId || '',
      owner_id: ownerId,
    },
  });

  const account = await connectedAccountRepository.create({
    userId: ownerId,
    hotelId,
    provider: 'stripe',
    providerAccountId: stripeAccount.id,
    accountType: accountType || 'express',
    country: stripeAccount.country,
    defaultCurrency: (stripeAccount.default_currency || 'usd').toUpperCase(),
    chargesEnabled: stripeAccount.charges_enabled,
    payoutsEnabled: stripeAccount.payouts_enabled,
    detailsSubmitted: stripeAccount.details_submitted,
    onboardingStatus: deriveOnboardingStatus(stripeAccount),
    isDefault: Boolean(isDefault),
    metadata: { created_by: actorUserId || null },
  });

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'payout.connect_account_created',
    entityType: 'connected_payment_account',
    entityId: account.id,
    hotelId: hotelId || null,
    after: { providerAccountId: stripeAccount.id, onboardingStatus: account.onboarding_status },
    requestId,
  });

  return account;
}

module.exports = { createConnectAccount };
