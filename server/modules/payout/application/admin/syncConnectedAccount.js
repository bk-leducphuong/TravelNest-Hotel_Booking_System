const ApiError = require('@utils/ApiError');
const { auditService } = require('@platform/audit');

const connectedAccountRepository = require('../../infrastructure/connected-account.repository');
const { getStripe } = require('../../infrastructure/stripe-client');
const { deriveOnboardingStatus } = require('../../domain/payout-rules');

/**
 * Pull the latest connected-account status from Stripe and mirror it locally
 * (charges/payouts enabled, requirements, onboarding status).
 */
async function syncConnectedAccount(accountId, { actorUserId, requestId } = {}) {
  const account = await connectedAccountRepository.findById(accountId);

  if (!account) {
    throw new ApiError(404, 'CONNECTED_ACCOUNT_NOT_FOUND', 'Connected account not found');
  }

  const stripe = getStripe();
  const stripeAccount = await stripe.accounts.retrieve(account.provider_account_id);

  await connectedAccountRepository.update(account.id, {
    chargesEnabled: stripeAccount.charges_enabled,
    payoutsEnabled: stripeAccount.payouts_enabled,
    detailsSubmitted: stripeAccount.details_submitted,
    onboardingStatus: deriveOnboardingStatus(stripeAccount),
    disabledReason: stripeAccount.disabled_reason || null,
    requirementsCurrentlyDue: stripeAccount.requirements?.currently_due || null,
    requirementsEventuallyDue: stripeAccount.requirements?.eventually_due || null,
    capabilities: stripeAccount.capabilities || null,
    lastSyncedAt: new Date(),
  });

  const refreshed = await connectedAccountRepository.findById(account.id);

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'payout.connect_account_synced',
    entityType: 'connected_payment_account',
    entityId: account.id,
    hotelId: account.hotel_id,
    after: {
      onboardingStatus: refreshed.onboarding_status,
      payoutsEnabled: refreshed.payouts_enabled,
    },
    requestId,
  });

  return refreshed;
}

module.exports = { syncConnectedAccount };
