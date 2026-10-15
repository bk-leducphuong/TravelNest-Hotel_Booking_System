const adminRoutes = require('./api/admin.routes');
const guestRoutes = require('./api/guest.routes');
const webhookRoutes = require('./api/webhook.routes');
const { registerPaymentSubscribers } = require('./events/subscribers');
const { refundBooking } = require('./application/admin/refundBooking');
const { createPaymentIntent } = require('./application/guest/createPaymentIntent');
const { getPaymentByBookingId } = require('./application/guest/getPaymentByBookingId');
const { getPaymentByTransactionId } = require('./application/guest/getPaymentByTransactionId');
const { getUserPayments } = require('./application/guest/getUserPayments');
const { createSetupIntent } = require('./application/guest/createSetupIntent');
const { savePaymentMethod } = require('./application/guest/savePaymentMethod');
const { listPaymentMethods } = require('./application/guest/listPaymentMethods');
const { setDefaultPaymentMethod } = require('./application/guest/setDefaultPaymentMethod');
const { removePaymentMethod } = require('./application/guest/removePaymentMethod');
const {
  getSavedPaymentMethodForCheckout,
} = require('./application/guest/getSavedPaymentMethodForCheckout');
const { handlePaymentSucceeded } = require('./application/webhooks/handlePaymentSucceeded');
const { handlePaymentFailed } = require('./application/webhooks/handlePaymentFailed');
const { handleRefundSucceeded } = require('./application/webhooks/handleRefundSucceeded');
const {
  handlePaymentMethodAttached,
} = require('./application/webhooks/handlePaymentMethodAttached');
const { handlePaymentMethodUpdated } = require('./application/webhooks/handlePaymentMethodUpdated');
const {
  handlePaymentMethodDetached,
} = require('./application/webhooks/handlePaymentMethodDetached');
const { handleCustomerUpdated } = require('./application/webhooks/handleCustomerUpdated');
const transactionRepository = require('./infrastructure/transaction.repository');
const ledgerRepository = require('./infrastructure/ledger.repository');
const idempotencyRepository = require('./infrastructure/idempotency.repository');
const ledgerService = require('./application/ledger.service');
const StripePaymentAdapter = require('./infrastructure/adapters/stripe-payment.adapter');
const stripePaymentAdapter = new StripePaymentAdapter();

// Register once per process (guarded).
registerPaymentSubscribers();

/**
 * Payment module - public interface.
 *
 * Owns the guest payment path (intents, reads) and the Stripe webhook handlers,
 * plus the admin refund surface and the ledger. Further extraction to a Go
 * service is a target.
 *
 * The persistence helpers below let other contexts (booking, payout, the Stripe
 * webhook edge) use payment-owned tables without importing payment's
 * repositories directly.
 */

// --- Transactions (booking creates/updates them; payout reads them) ---
async function createTransaction(data, options = {}) {
  return await transactionRepository.create(data, options);
}

async function updateTransaction(transactionId, data, options = {}) {
  return await transactionRepository.update(transactionId, data, options);
}

async function getTransactionById(transactionId, options = {}) {
  return await transactionRepository.findById(transactionId, options);
}

// --- Idempotency keys (booking dedupes creation) ---
async function findIdempotencyRecord(userId, idempotencyKey, options = {}) {
  return await idempotencyRepository.findByUserAndKey(userId, idempotencyKey, options);
}

async function createIdempotencyRecord(data, options = {}) {
  return await idempotencyRepository.create(data, options);
}

async function completeIdempotencyRecord(id, data, options = {}) {
  return await idempotencyRepository.markCompleted(id, data, options);
}

async function failIdempotencyRecord(id, options = {}) {
  return await idempotencyRepository.markFailed(id, options);
}

/** Re-claim a stale/failed idempotency record (recovery after a crash). */
async function touchIdempotencyRecord(id, data = {}, options = {}) {
  return await idempotencyRepository.touchProcessing(id, data, options);
}

// --- Ledger (payout reads the account owner) ---
async function getPrimaryOwnerByHotelId(hotelId, options = {}) {
  return await ledgerRepository.findPrimaryOwnerByHotelId(hotelId, options);
}

/** Webhook event log used by the Stripe webhook edge (idempotency + audit). */
const webhookEventLog = require('./infrastructure/webhook-event-log');

/**
 * Stripe provider operations for the contexts that drive Stripe on the booking
 * side (booking creates/reads/cancels the PaymentIntent). Exposing these keeps
 * the Stripe adapter inside payment instead of leaking it to booking.
 */
const paymentProvider = {
  getPayment: (paymentId) => stripePaymentAdapter.getPayment(paymentId),
  /**
   * Create a PaymentIntent. When `paymentMethodId` is one of the buyer's saved
   * cards we attach the owning Stripe customer, which Stripe requires before an
   * attached payment method can be charged.
   */
  createPayment: async (params) => {
    let customerId = params.customerId || null;

    if (!customerId && params.paymentMethodId && (params.buyerId || params.userId)) {
      const saved = await getSavedPaymentMethodForCheckout(
        params.buyerId || params.userId,
        params.paymentMethodId
      );
      customerId = saved?.customerId || null;
    }

    return stripePaymentAdapter.createPayment({ ...params, customerId });
  },
  cancelPayment: (paymentId) => stripePaymentAdapter.cancelPayment(paymentId),
};

module.exports = {
  adminRoutes,
  guestRoutes,
  webhookRoutes,
  refundBooking,

  // Guest payment path
  createPaymentIntent,
  getPaymentByBookingId,
  getPaymentByTransactionId,
  getUserPayments,
  createSetupIntent,
  savePaymentMethod,
  listPaymentMethods,
  setDefaultPaymentMethod,
  removePaymentMethod,
  getSavedPaymentMethodForCheckout,

  // Stripe webhook handlers
  handlePaymentSucceeded,
  handlePaymentFailed,
  handleRefundSucceeded,
  handlePaymentMethodAttached,
  handlePaymentMethodUpdated,
  handlePaymentMethodDetached,
  handleCustomerUpdated,

  // Persistence API for other contexts.
  createTransaction,
  updateTransaction,
  getTransactionById,
  findIdempotencyRecord,
  createIdempotencyRecord,
  completeIdempotencyRecord,
  failIdempotencyRecord,
  touchIdempotencyRecord,
  getPrimaryOwnerByHotelId,
  webhookEventLog,

  // Stripe provider operations (booking's payment flow).
  paymentProvider,

  // Ledger posting (payout + payment webhooks).
  ledger: ledgerService,
};
