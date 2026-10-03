/**
 * Lazy accessor for the payment module's public API.
 *
 * Payment imports the booking module at load time (its webhook handlers confirm
 * bookings), so booking must require payment lazily to avoid a load-time cycle.
 */
function paymentModule() {
  return require('@modules/payment');
}

module.exports = { paymentModule };
