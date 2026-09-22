const adminRoutes = require('./api/admin.routes');
const payoutService = require('./application/payout.service');

/**
 * Payout module - public interface.
 *
 * Owns payouts, payout items and Stripe Connect accounts. The payout service
 * (eligibility, Stripe transfer, ledger, owner notification) lives here now;
 * it can be split into its own service later.
 */
module.exports = {
  adminRoutes,
  createEligiblePayouts: payoutService.createEligiblePayouts.bind(payoutService),
  processStripeTransfer: payoutService.processStripeTransfer.bind(payoutService),
};
