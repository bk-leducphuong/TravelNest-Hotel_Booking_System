import http from './http'

export const PaymentService = {
  getPayments(params = {}) {
    return http.get('/payments', { params })
  },

  createPaymentIntent(paymentData) {
    return http.post('/payments', paymentData)
  },

  getPaymentByBookingId(bookingId) {
    return http.get(`/payments/bookings/${bookingId}`)
  },

  getPaymentByTransactionId(transactionId) {
    return http.get(`/payments/transactions/${transactionId}`)
  }
}
