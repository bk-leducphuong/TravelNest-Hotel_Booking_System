/**
 * Legacy response shaping for guest booking reads.
 *
 * The public site historically received `city` as a string and images under
 * `image_urls`; keep that contract until the clients are migrated.
 */
function formatHotelForLegacyClients(hotel) {
  if (!hotel) return null;

  const hotelData = hotel.toJSON ? hotel.toJSON() : hotel;

  return {
    ...hotelData,
    city: hotelData.city?.name || hotelData.city || null,
    image_urls: hotelData.images || hotelData.image_urls || [],
  };
}

function formatRoom(room) {
  if (!room) return null;

  return {
    room_id: room.id,
    room_name: room.room_name,
  };
}

/**
 * Shape the booking-creation response. Shared by the create use-case and the
 * idempotent replay path, so the two can never drift.
 */
function formatBookingResponse({ booking, transaction, quote }) {
  return {
    bookingId: booking.id,
    bookingCode: booking.booking_code,
    status: booking.status,
    paymentDueAt: booking.payment_due_at,
    transactionId: transaction.id,
    price: {
      subtotal: quote.subtotal,
      taxAmount: quote.taxAmount,
      serviceFeeAmount: quote.serviceFeeAmount,
      platformCommissionAmount: quote.platformCommissionAmount,
      totalPrice: quote.totalPrice,
      currency: quote.currency,
    },
    rooms: quote.rooms,
    cancellationPolicy: quote.cancellationPolicy,
  };
}

module.exports = { formatHotelForLegacyClients, formatRoom, formatBookingResponse };
