const StripePaymentAdapter = require('../../infrastructure/adapters/stripe-payment.adapter');
const { getOrCreateStripeCustomer } = require('./getOrCreateStripeCustomer');

const stripeAdapter = new StripePaymentAdapter();

/**
 * Create a Stripe SetupIntent so the client can attach a card to the user's
 * customer. The client confirms it with Stripe.js (`stripe.confirmCardSetup`),
 * then calls `savePaymentMethod` to mirror the card locally.
 *
 * @param {number|string} userId
 * @returns {Promise<{ clientSecret: string, setupIntentId: string, customerId: string }>}
 */
async function createSetupIntent(userId) {
  const customerId = await getOrCreateStripeCustomer(userId);

  const setupIntent = await stripeAdapter.createSetupIntent({
    customerId,
    metadata: { user_id: String(userId) },
  });

  return {
    clientSecret: setupIntent.clientSecret,
    setupIntentId: setupIntent.id,
    customerId: setupIntent.customerId || customerId,
  };
}

module.exports = { createSetupIntent };
