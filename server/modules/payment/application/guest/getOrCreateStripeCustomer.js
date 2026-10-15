const ApiError = require('@utils/ApiError');
const identityModule = require('@modules/identity');
const StripePaymentAdapter = require('../../infrastructure/adapters/stripe-payment.adapter');

const stripeAdapter = new StripePaymentAdapter();

/**
 * Resolve the user's Stripe customer, creating (and persisting) one on first use.
 *
 * The customer is stored on `users.stripe_customer_id`; the mapping is owned by
 * the identity module and reached through its public index.
 *
 * @param {number|string} userId
 * @returns {Promise<string>} Stripe customer id (cus_xxx)
 */
async function getOrCreateStripeCustomer(userId) {
  const { users } = identityModule;

  const existingCustomerId = await users.getStripeCustomerId(userId);
  if (existingCustomerId) {
    return existingCustomerId;
  }

  const contact = await users.getPaymentCustomerContact(userId);
  if (!contact) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  const customer = await stripeAdapter.createCustomer({
    email: contact.email,
    name: contact.name,
    metadata: { user_id: String(contact.id) },
  });

  await users.setStripeCustomerId(userId, customer.id);

  return customer.id;
}

module.exports = { getOrCreateStripeCustomer };
