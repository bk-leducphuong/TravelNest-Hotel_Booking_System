import http from './http';

export const PaymentService = {
  getPayments(params = {}) {
    return http.get('/payments', { params });
  },

  createPaymentIntent(paymentData) {
    return http.post('/payments', paymentData);
  },

  getPaymentByBookingId(bookingId) {
    return http.get(`/payments/bookings/${bookingId}`);
  },

  getPaymentByTransactionId(transactionId) {
    return http.get(`/payments/transactions/${transactionId}`);
  },

  // --- Saved payment methods (account settings) ---

  listPaymentMethods() {
    return http.get('/payments/methods');
  },

  createSetupIntent() {
    return http.post('/payments/methods/setup-intent');
  },

  savePaymentMethod(setupIntentId) {
    return http.post('/payments/methods', { setupIntentId });
  },

  setDefaultPaymentMethod(paymentMethodId) {
    return http.post(`/payments/methods/${paymentMethodId}/default`);
  },

  removePaymentMethod(paymentMethodId) {
    return http.delete(`/payments/methods/${paymentMethodId}`);
  },
};
