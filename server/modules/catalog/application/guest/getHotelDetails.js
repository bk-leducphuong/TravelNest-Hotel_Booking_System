const ApiError = require('@utils/ApiError');
const roomRepository = require('@repositories/room.repository');
const hotelRepository = require('../../infrastructure/hotel.repository');

const {
  formatImages,
  formatAmenities,
  formatRatingSummary,
  formatRatingBreakdown,
  formatReviews,
  formatNearbyPlaces,
  formatPolicies,
  formatRooms,
} = require('./formatters');

/**
 * Get comprehensive hotel details: hotel, images, amenities, rating summary and
 * breakdown, reviews, nearby places, policies and (optionally) available rooms.
 *
 * @param {string} hotelId
 * @param {{ checkInDate?: string, checkOutDate?: string, numberOfNights?: number, numberOfRooms?: number, numberOfGuests?: number }} options
 */
async function getHotelDetails(hotelId, options = {}) {
  const { checkInDate, checkOutDate, numberOfNights, numberOfRooms, numberOfGuests } = options;

  // Fetch all data in parallel for better performance
  const [hotel, ratingSummary, reviewsResult, reviewCriteria, nearbyPlaces, policies, rooms] =
    await Promise.all([
      hotelRepository.findById(hotelId),
      hotelRepository.findRatingSummaryByHotelId(hotelId),
      hotelRepository.findReviewsByHotelId(hotelId, { limit: 10, offset: 0 }),
      hotelRepository.findReviewCriteriasByHotelId(hotelId),
      hotelRepository.findNearbyPlacesByHotelId(hotelId, { limit: 20 }),
      hotelRepository.findPoliciesByHotelId(hotelId),
      checkInDate && checkOutDate && numberOfNights && numberOfRooms
        ? roomRepository.findAvailableRooms(hotelId, checkInDate, checkOutDate, {
            numberOfRooms,
            numberOfNights,
            numberOfGuests,
          })
        : Promise.resolve([]),
    ]);

  if (!hotel) {
    throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
  }

  const hotelData = hotel.toJSON ? hotel.toJSON() : hotel;
  const hasSearchParams = !!(checkInDate && checkOutDate && numberOfNights);

  return {
    hotel: {
      id: hotelData.id,
      name: hotelData.name,
      description: hotelData.description,
      address: hotelData.address,
      city: hotelData.city,
      country: hotelData.country,
      phoneNumber: hotelData.phone_number,
      latitude: parseFloat(hotelData.latitude),
      longitude: parseFloat(hotelData.longitude),
      hotelClass: hotelData.hotel_class,
      minPrice: hotelData.min_price ? parseFloat(hotelData.min_price) : null,
      status: hotelData.status,
      timezone: hotelData.timezone,
    },
    checkInOut: {
      checkInTime: hotelData.check_in_time,
      checkOutTime: hotelData.check_out_time,
      checkInPolicy: hotelData.check_in_policy,
      checkOutPolicy: hotelData.check_out_policy,
    },
    images: formatImages(hotelData.images),
    amenities: formatAmenities(hotelData.amenities),
    ratingSummary: formatRatingSummary(ratingSummary),
    ratingBreakdown: formatRatingBreakdown(reviewCriteria),
    reviews: formatReviews(reviewsResult.rows || []),
    nearbyPlaces: formatNearbyPlaces(nearbyPlaces),
    policies: formatPolicies(policies),
    rooms: formatRooms(rooms, numberOfNights),
    meta: {
      totalReviews: reviewsResult.count || 0,
      hasSearchParams,
      searchParams: hasSearchParams
        ? {
            checkInDate,
            checkOutDate,
            numberOfNights,
            numberOfRooms,
            numberOfGuests,
          }
        : null,
    },
  };
}

module.exports = { getHotelDetails };
