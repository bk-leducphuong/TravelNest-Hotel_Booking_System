const { subscribe, DOMAIN_EVENTS } = require('@platform/events');
const logger = require('@config/logger.config');

const { applyAccountUpdatedFromStripe } = require('../application/connectedAccountSync');
const { reconcileTransferFromStripe } = require('../application/reconcileTransfer');

let registered = false;

/**
 * Mirror a Stripe Connect `account.updated` payload onto the local record so
 * onboarding status flips to `completed` without a manual `sync` call.
 */
async function handleConnectAccountUpdated(payload = {}) {
  try {
    const updated = await applyAccountUpdatedFromStripe(payload.stripeAccount);

    if (!updated) {
      logger.info(
        { providerAccountId: payload.providerAccountId },
        'account.updated ignored: no local connected account for this provider id'
      );
      return;
    }

    logger.info(
      {
        providerAccountId: payload.providerAccountId,
        onboardingStatus: updated.onboarding_status,
        payoutsEnabled: updated.payouts_enabled,
      },
      'Connected account refreshed from account.updated webhook'
    );
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to apply account.updated webhook');
  }
}

/**
 * Reconcile a Connect `transfer.*` event with the local payout row.
 */
async function handleConnectTransferUpdated(payload = {}) {
  try {
    await reconcileTransferFromStripe({
      transfer: payload.transfer,
      eventType: payload.eventType,
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to reconcile Connect transfer webhook');
  }
}

/**
 * Wire payout-domain subscribers. Safe to call more than once.
 */
function registerPayoutSubscribers() {
  if (registered) {
    return;
  }
  registered = true;

  subscribe(DOMAIN_EVENTS.CONNECT_ACCOUNT_UPDATED, handleConnectAccountUpdated);
  subscribe(DOMAIN_EVENTS.CONNECT_TRANSFER_UPDATED, handleConnectTransferUpdated);

  logger.info('Payout module event subscribers registered');
}

module.exports = { registerPayoutSubscribers };
