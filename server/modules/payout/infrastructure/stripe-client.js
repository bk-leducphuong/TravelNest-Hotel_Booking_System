const ApiError = require('@utils/ApiError');
const stripeConfig = require('@config/stripe.config');

/**
 * Lazy access to the Stripe client. Using the shared config keeps the API
 * version/retry/timeout settings consistent with the rest of the app.
 */
function isStripeConfigured() {
  return Boolean(stripeConfig && stripeConfig.client);
}

function getStripe() {
  if (!isStripeConfigured()) {
    throw new ApiError(
      503,
      'STRIPE_NOT_CONFIGURED',
      'Stripe is not configured. Payout operations are unavailable.'
    );
  }
  return stripeConfig.client;
}

module.exports = { getStripe, isStripeConfigured };
