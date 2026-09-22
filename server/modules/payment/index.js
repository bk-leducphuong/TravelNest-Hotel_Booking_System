const adminRoutes = require('./api/admin.routes');
const { registerPaymentSubscribers } = require('./events/subscribers');
const { refundBooking } = require('./application/admin/refundBooking');

// Register once per process (guarded).
registerPaymentSubscribers();

/**
 * Payment module - public interface.
 *
 * The guest payment path still uses `@services/payment.service`; consolidating
 * it into this module is a follow-up. This slice owns the admin surface.
 */
module.exports = {
  adminRoutes,
  refundBooking,
};
