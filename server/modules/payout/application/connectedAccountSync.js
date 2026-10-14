const connectedAccountRepository = require('../infrastructure/connected-account.repository');
const { deriveOnboardingStatus } = require('../domain/payout-rules');

/**
 * Connected-account status sync.
 *
 * Maps a Stripe Account payload onto the local `connected_payment_accounts`
 * row. Used by both the admin `sync` endpoint (pull) and the `account.updated`
 * webhook (push), so the mapping lives in one place.
 */

function mapStripeAccountToUpdate(stripeAccount) {
  return {
    chargesEnabled: stripeAccount.charges_enabled,
    payoutsEnabled: stripeAccount.payouts_enabled,
    detailsSubmitted: stripeAccount.details_submitted,
    onboardingStatus: deriveOnboardingStatus(stripeAccount),
    disabledReason: stripeAccount.disabled_reason || null,
    requirementsCurrentlyDue: stripeAccount.requirements?.currently_due || null,
    requirementsEventuallyDue: stripeAccount.requirements?.eventually_due || null,
    capabilities: stripeAccount.capabilities || null,
    country: stripeAccount.country || undefined,
    defaultCurrency: stripeAccount.default_currency
      ? String(stripeAccount.default_currency).toUpperCase()
      : undefined,
    lastSyncedAt: new Date(),
  };
}

/**
 * Persist a Stripe Account payload onto a known local account and return the
 * refreshed row.
 */
async function applyStripeAccountStatus(account, stripeAccount) {
  await connectedAccountRepository.update(account.id, mapStripeAccountToUpdate(stripeAccount));
  return connectedAccountRepository.findById(account.id);
}

/**
 * Handle a Stripe `account.updated` payload: find the local mirror by provider
 * account id and refresh it. Returns null when the account was not created
 * through this app (e.g. it was created directly in the Stripe dashboard).
 */
async function applyAccountUpdatedFromStripe(stripeAccount) {
  if (!stripeAccount?.id) {
    return null;
  }

  const account = await connectedAccountRepository.findByProviderAccountId(stripeAccount.id);
  if (!account) {
    return null;
  }

  return applyStripeAccountStatus(account, stripeAccount);
}

module.exports = {
  mapStripeAccountToUpdate,
  applyStripeAccountStatus,
  applyAccountUpdatedFromStripe,
};
