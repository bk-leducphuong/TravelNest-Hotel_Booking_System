const hotelRepository = require('../repositories/hotel.repository');
const ApiError = require('../utils/ApiError');

/**
 * Hotel Service - Contains main business logic
 * Follows RESTful API standards
 */

class HotelService {
  /**
   * Get hotel details with rooms, reviews, nearby places, and review criteria
   * @param {number} hotelId - Hotel ID
   * @param {Object} options - Search options (checkInDate, checkOutDate, numberOfDays, numberOfRooms, numberOfGuests)
   * @returns {Promise<Object>} Hotel details with related data
   */
  async getHotelDetails(hotelId, options = {}) {
    const {
      checkInDate,
      checkOutDate,
      numberOfDays,
      numberOfRooms,
      numberOfGuests,
    } = options;

    // Get hotel basic information
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) {
      throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
    }

    // Get available rooms if search parameters are provided
    let rooms = [];
    if (checkInDate && checkOutDate && numberOfDays && numberOfRooms) {
      rooms = await hotelRepository.findAvailableRooms(
        hotelId,
        checkInDate,
        checkOutDate,
        {
          numberOfRooms,
          numberOfDays,
          numberOfGuests,
        }
      );
    }

    // Get reviews with pagination
    const reviewsResult = await hotelRepository.findReviewsByHotelId(hotelId, {
      limit: 10, // Default limit for reviews
      offset: 0,
    });

    // Get nearby places
    const nearbyPlaces =
      await hotelRepository.findNearbyPlacesByHotelId(hotelId);

    // Get review criteria averages
    const reviewCriterias =
      await hotelRepository.findReviewCriteriasByHotelId(hotelId);

    // Get hotel policies
    const policies = await hotelRepository.findPoliciesByHotelId(hotelId);

    return {
      hotel: hotel.toJSON ? hotel.toJSON() : hotel,
      rooms,
      reviews: reviewsResult.rows || [],
      nearbyPlaces: nearbyPlaces.map((place) =>
        place.toJSON ? place.toJSON() : place
      ),
      reviewCriterias,
      policies: policies.map((policy) =>
        policy.toJSON ? policy.toJSON() : policy
      ),
      meta: {
        totalReviews: reviewsResult.count || 0,
      },
    };
  }

  /**
   * Search available rooms for a hotel
   * @param {number} hotelId - Hotel ID
   * @param {Object} searchParams - Search parameters
   * @param {string} searchParams.checkInDate - Check-in date
   * @param {string} searchParams.checkOutDate - Check-out date
   * @param {number} searchParams.numberOfDays - Number of days
   * @param {number} searchParams.numberOfRooms - Number of rooms needed
   * @param {number} searchParams.numberOfGuests - Number of guests
   * @param {number} searchParams.page - Page number (default: 1)
   * @param {number} searchParams.limit - Items per page (default: 20, max: 100)
   * @returns {Promise<Object>} Available rooms with pagination
   */
  async searchRooms(hotelId, searchParams) {
    const {
      checkInDate,
      checkOutDate,
      numberOfDays,
      numberOfRooms = 1,
      numberOfGuests,
      page = 1,
      limit = 20,
    } = searchParams;

    // Validate required parameters
    if (!checkInDate || !checkOutDate || !numberOfDays) {
      throw new ApiError(
        400,
        'MISSING_PARAMETERS',
        'checkInDate, checkOutDate, and numberOfDays are required'
      );
    }

    // Validate hotel exists
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) {
      throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
    }

    // Validate limit
    const validatedLimit = Math.min(limit, 100);
    const offset = (page - 1) * validatedLimit;

    // Get available rooms
    const rooms = await hotelRepository.findAvailableRooms(
      hotelId,
      checkInDate,
      checkOutDate,
      {
        numberOfRooms,
        numberOfDays,
        numberOfGuests,
        limit: validatedLimit,
        offset,
      }
    );

    return {
      rooms: rooms.map((room) => ({
        roomId: room.id || room.room_id,
        roomName: room.room_name,
        maxGuests: room.max_guests,
        roomImageUrls: room.room_image_urls,
        roomAmenities: room.room_amenities,
        pricePerNight: parseFloat(room.price_per_night) || 0,
        availableRooms: room.available_rooms || 0,
      })),
      page,
      limit: validatedLimit,
      total: rooms.length, // Note: This is approximate, full count would require separate query
    };
  }

  /**
   * Check room availability for specific rooms
   * @param {number} hotelId - Hotel ID
   * @param {Array<Object>} selectedRooms - Array of {roomId, roomQuantity}
   * @param {string} checkInDate - Check-in date
   * @param {string} checkOutDate - Check-out date
   * @param {number} numberOfDays - Number of days
   * @param {number} numberOfGuests - Number of guests
   * @returns {Promise<boolean>} True if all rooms are available
   */
  async checkRoomAvailability(
    hotelId,
    selectedRooms,
    checkInDate,
    checkOutDate,
    numberOfDays,
    numberOfGuests
  ) {
    // Validate hotel exists
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) {
      throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
    }

    // Validate required parameters
    if (!checkInDate || !checkOutDate || !numberOfDays) {
      throw new ApiError(
        400,
        'MISSING_PARAMETERS',
        'checkInDate, checkOutDate, and numberOfDays are required'
      );
    }

    if (
      !selectedRooms ||
      !Array.isArray(selectedRooms) ||
      selectedRooms.length === 0
    ) {
      throw new ApiError(
        400,
        'INVALID_INPUT',
        'selectedRooms must be a non-empty array'
      );
    }

    // Extract room IDs
    const roomIds = selectedRooms.map((room) => room.roomId || room.room_id);

    // Check availability
    const availableRooms = await hotelRepository.checkRoomAvailability(
      hotelId,
      roomIds,
      checkInDate,
      checkOutDate,
      numberOfDays
    );

    // Check if all selected rooms are available in required quantities
    for (const selectedRoom of selectedRooms) {
      const room = availableRooms.find(
        (r) => (r.room_id || r.id) === (selectedRoom.room_id || selectedRoom.roomId)
      );

      if (!room) {
        return false;
      }

      if (room.available_rooms < selectedRoom.roomQuantity) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all policies for a hotel
   * @param {string} hotelId - Hotel ID (UUID)
   * @returns {Promise<Array>} List of hotel policies
   */
  async getHotelPolicies(hotelId) {
    // Validate hotel exists
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) {
      throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
    }

    const policies = await hotelRepository.findPoliciesByHotelId(hotelId);

    return policies.map((policy) => ({
      id: policy.id,
      policyType: policy.policy_type,
      title: policy.title,
      description: policy.description,
      displayOrder: policy.display_order,
      icon: policy.icon,
    }));
  }
}

module.exports = new HotelService();
