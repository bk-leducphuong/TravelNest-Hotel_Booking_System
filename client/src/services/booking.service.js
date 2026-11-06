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
    // Optional server-side filters/pagination.
    if (typeof options.reviewed === 'boolean') {
      params.reviewed = options.reviewed
    }
    if (options.bookedAfter) {
      params.bookedAfter = options.bookedAfter
    }
    if (options.page) {
      params.page = options.page
    }
    if (options.limit) {
      params.limit = options.limit
    }
    return http.get('/bookings', {
      params
    })
  },

  // Completed trips the user can still review (paginated server-side).
  getReviewableBookings(params = {}) {
    return http.get('/bookings/reviewable', {
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
