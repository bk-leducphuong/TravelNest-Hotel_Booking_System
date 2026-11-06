const ApiError = require('@utils/ApiError');
const bookingRepository = require('../../infrastructure/booking.repository');

/**
 * Expose the hotel's active images as `image_urls` (primary first) so clients
 * don't need to know about the internal `images` association shape. Mirrors
 * `formatHotelForLegacyClients` used by the other booking endpoints.
 */
function withHotelImageUrls(booking) {
  const data = booking.toJSON ? booking.toJSON() : booking;
  if (!data.hotel) return data;

  const images = Array.isArray(data.hotel.images) ? data.hotel.images : [];
  const sorted = [...images].sort(
    (a, b) =>
      (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) ||
      (a.display_order || 0) - (b.display_order || 0)
  );

  const hotel = { ...data.hotel };
  delete hotel.images;

  return {
    ...data,
    hotel: {
      ...hotel,
      image_urls: sorted.map((image) => image.object_key).filter(Boolean),
    },
  };
}

/**
 * Get a booking by its public booking code, scoped to its buyer.
 *
 * @param {string} bookingCode
 * @param {number} userId
 * @returns {Promise<object>}
 */
async function getBookingByCode(bookingCode, userId) {
  const booking = await bookingRepository.findDetailedByBookingCodeAndBuyerId(bookingCode, userId);

  if (!booking) {
    throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
  }

  return withHotelImageUrls(booking);
}

module.exports = { getBookingByCode };
