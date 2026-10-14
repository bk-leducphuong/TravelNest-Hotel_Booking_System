import http from './http'

export const BookingService = {
  createBooking(bookingData, idempotencyKey) {
    return http.post('/bookings', bookingData, {
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    })
  },

  createBookingPaymentIntent(bookingId, paymentData = {}) {
    return http.post(`/bookings/${bookingId}/payment-intent`, paymentData)
  },

  getBookings(includeCancelled = false, options = {}) {
    const params = { includeCancelled }
    // Optional server-side review filter: true = reviewed only,
    // false = unreviewed only.
    if (typeof options.reviewed === 'boolean') {
      params.reviewed = options.reviewed
    }
    return http.get('/bookings', {
      params
    })
  },

  getBookingById(bookingId) {
    return http.get(`/bookings/${bookingId}`)
  },

  getBookingByCode(bookingCode) {
    return http.get(`/bookings/code/${bookingCode}`)
  },

  cancelBooking(bookingId, processRefund = false) {
    return http.delete(`/bookings/${bookingId}`, {
      params: { processRefund }
    })
  }
}
