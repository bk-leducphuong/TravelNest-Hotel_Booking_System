/**
 * Normalize a Stripe SDK error into the common error shape used by the payment
 * adapters. Shared so the customer/payment-method adapter and the payment
 * adapter fail identically.
 */
function normalizeStripeError(error) {
  const normalizedError = new Error(error.message);
  normalizedError.code = error.code || 'UNKNOWN_ERROR';
  normalizedError.type = error.type || 'api_error';
  normalizedError.statusCode = error.statusCode || 500;
  normalizedError.provider = 'stripe';
  // Deployment/configuration faults are not worth retrying on a backoff loop;
  // keep the flag so callers can route them straight to manual attention.
  normalizedError.permanent = Boolean(error.permanent);
  normalizedError.raw = error;

  return normalizedError;
}

module.exports = { normalizeStripeError };
