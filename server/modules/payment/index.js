const adminRoutes = require('./api/admin.routes');
const { registerPaymentSubscribers } = require('./events/subscribers');
const { refundBooking } = require('./application/admin/refundBooking');
const { createPaymentIntent } = require('./application/guest/createPaymentIntent');
const { getPaymentByBookingId } = require('./application/guest/getPaymentByBookingId');
const { getPaymentByTransactionId } = require('./application/guest/getPaymentByTransactionId');
const { getUserPayments } = require('./application/guest/getUserPayments');
const { handlePaymentSucceeded } = require('./application/webhooks/handlePaymentSucceeded');
const { handlePaymentFailed } = require('./application/webhooks/handlePaymentFailed');
const { handleRefundSucceeded } = require('./application/webhooks/handleRefundSucceeded');

// Register once per process (guarded).
registerPaymentSubscribers();

/**
 * Payment module - public interface.
 *
 * Owns the guest payment path (intents, reads) and the Stripe webhook handlers,
 * plus the admin refund surface. Consolidating the legacy `@services/payment`
 * path into this module is done; further extraction to a service is a target.
 */
module.exports = {
  adminRoutes,
  refundBooking,

  // Guest payment path
  createPaymentIntent,
  getPaymentByBookingId,
  getPaymentByTransactionId,
  getUserPayments,

  // Stripe webhook handlers
  handlePaymentSucceeded,
  handlePaymentFailed,
  handleRefundSucceeded,
};
