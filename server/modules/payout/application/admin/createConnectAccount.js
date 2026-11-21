const ApiError = require('@utils/ApiError');
const { auditService } = require('@platform/audit');

const connectedAccountRepository = require('../../infrastructure/connected-account.repository');
const { getStripe } = require('../../infrastructure/stripe-client');
const { deriveOnboardingStatus } = require('../../domain/payout-rules');
const { resolveCreateConnectedAccountScope } = require('./connected-account-scope');

/**
 * Create a Stripe Connect account for an owner (optionally hotel-scoped) and
 * persist the local mirror.
 *
 * The owner must actually have the `owner` role on the target hotel (or on at
 * least one hotel for an owner-level account); hotel-scoped callers cannot
 * create an account for a foreign hotel or arbitrary user.
 */
async function createConnectAccount(
  { hotelId, ownerId, email, country, accountType, isDefault } = {},
  { actorUserId, actorHotelId, isPlatformStaff, requestId } = {}
) {
  if (!ownerId) {
    throw new ApiError(400, 'MISSING_OWNER', 'ownerId is required to create a connect account');
  }

  const scope = await resolveCreateConnectedAccountScope({
    hotelId,
    ownerId,
    actorUserId,
    actorHotelId,
    isPlatformStaff,
  });
  const effectiveHotelId = scope.hotelId;

  const existing = await connectedAccountRepository.findExisting({
    hotelId: effectiveHotelId,
    ownerId,
  });
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
      hotel_id: effectiveHotelId || '',
      owner_id: ownerId,
    },
  });

  const account = await connectedAccountRepository.create({
    userId: ownerId,
    hotelId: effectiveHotelId,
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
    hotelId: effectiveHotelId || null,
    after: { providerAccountId: stripeAccount.id, onboardingStatus: account.onboarding_status },
    requestId,
  });

  return account;
}

module.exports = { createConnectAccount };
