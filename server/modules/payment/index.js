const adminRoutes = require('./api/admin.routes');
const guestRoutes = require('./api/guest.routes');
const { registerPaymentSubscribers } = require('./events/subscribers');
const { refundBooking } = require('./application/admin/refundBooking');
const { createPaymentIntent } = require('./application/guest/createPaymentIntent');
const { getPaymentByBookingId } = require('./application/guest/getPaymentByBookingId');
const { getPaymentByTransactionId } = require('./application/guest/getPaymentByTransactionId');
const { getUserPayments } = require('./application/guest/getUserPayments');
const { handlePaymentSucceeded } = require('./application/webhooks/handlePaymentSucceeded');
const { handlePaymentFailed } = require('./application/webhooks/handlePaymentFailed');
const { handleRefundSucceeded } = require('./application/webhooks/handleRefundSucceeded');
const transactionRepository = require('./infrastructure/transaction.repository');
const ledgerRepository = require('./infrastructure/ledger.repository');
const idempotencyRepository = require('./infrastructure/idempotency.repository');
const webhookEventLogRepository = require('./infrastructure/webhook_event_log.repository');
const ledgerService = require('./application/ledger.service');

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

// --- Ledger (payout reads the account owner) ---
async function getPrimaryOwnerByHotelId(hotelId, options = {}) {
  return await ledgerRepository.findPrimaryOwnerByHotelId(hotelId, options);
}

/** Webhook event log used by the Stripe webhook edge (idempotency + audit). */
const webhookEventLog = {
  findByEventId: (eventId) => webhookEventLogRepository.findByEventId(eventId),
  create: (data) => webhookEventLogRepository.create(data),
  updateStatus: (eventId, status, errorMessage) =>
    webhookEventLogRepository.updateStatus(eventId, status, errorMessage),
};

module.exports = {
  adminRoutes,
  guestRoutes,
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

  // Persistence API for other contexts.
  createTransaction,
  updateTransaction,
  getTransactionById,
  findIdempotencyRecord,
  createIdempotencyRecord,
  completeIdempotencyRecord,
  failIdempotencyRecord,
  getPrimaryOwnerByHotelId,
  webhookEventLog,

  // Ledger posting (payout + payment webhooks).
  ledger: ledgerService,
};
