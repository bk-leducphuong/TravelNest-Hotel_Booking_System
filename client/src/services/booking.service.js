import http from './http'

export const BookingService = {
  getBookings(includeCancelled = false) {
    return http.get('/bookings', {
      params: { includeCancelled }
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
