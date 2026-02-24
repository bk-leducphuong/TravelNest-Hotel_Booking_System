const adminBookingRepository = require('../../repositories/admin/booking.repository');
const ApiError = require('../../utils/ApiError');

/**
 * Admin Booking Service - Contains main business logic for admin booking management
 * Follows RESTful API standards
 */

class AdminBookingService {
  /**
   * Get all bookings for a specific hotel
   * Automatically updates booking status based on dates
   * @param {number} hotelId - Hotel ID
   * @param {number} ownerId - Owner ID (for authorization)
   * @param {Object} options - Query options
   * @param {string} options.status - Filter by status
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @returns {Promise<Object>} Paginated bookings with metadata
   */
  async getAllBookings(hotelId, ownerId, options = {}) {
    // Verify hotel ownership
    const isOwner = await adminBookingRepository.verifyHotelOwnership(hotelId, ownerId);

    if (!isOwner) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to access this hotel');
    }

    // Update booking statuses based on current date
    await adminBookingRepository.updateStatusByDates(hotelId);

    // Get bookings with pagination
    const result = await adminBookingRepository.findByHotelId(hotelId, options);

    // Enrich bookings with room information
    const enrichedBookings = await Promise.all(
      result.bookings.map(async (booking) => {
        const bookingData = booking.toJSON ? booking.toJSON() : booking;
        const room = await adminBookingRepository.findRoomById(bookingData.room_id);

        return {
          ...bookingData,
          room: room ? (room.toJSON ? room.toJSON() : room) : null,
        };
      })
    );

    return {
      bookings: enrichedBookings,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: options.limit || 20,
      },
    };
  }

  /**
   * Get a specific booking by ID
   * @param {number} bookingId - Booking ID
   * @param {number} ownerId - Owner ID (for authorization)
   * @returns {Promise<Object>} Booking details with room information
   */
  async getBookingById(bookingId, ownerId) {
    const booking = await adminBookingRepository.findById(bookingId);

    if (!booking) {
      throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
    }

    // Verify hotel ownership
    const isOwner = await adminBookingRepository.verifyHotelOwnership(booking.hotel_id, ownerId);

    if (!isOwner) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to access this booking');
    }

    // Get room information
    const room = await adminBookingRepository.findRoomById(booking.room_id);

    const bookingData = booking.toJSON ? booking.toJSON() : booking;

    return {
      ...bookingData,
      room: room ? (room.toJSON ? room.toJSON() : room) : null,
    };
  }

  /**
   * Get booker information for a specific booking
   * @param {number} bookingId - Booking ID
   * @param {number} ownerId - Owner ID (for authorization)
   * @returns {Promise<Object>} Booker information
   */
  async getBookerInformation(bookingId, ownerId) {
    const booking = await adminBookingRepository.findById(bookingId);

    if (!booking) {
      throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
    }

    // Verify hotel ownership
    const isOwner = await adminBookingRepository.verifyHotelOwnership(booking.hotel_id, ownerId);

    if (!isOwner) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to access this booking');
    }

    // Get booker information
    const booker = await adminBookingRepository.findUserById(booking.buyer_id);

    if (!booker) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'Booker not found');
    }

    return booker.toJSON ? booker.toJSON() : booker;
  }

  /**
   * Update booking status
   * @param {number} bookingId - Booking ID
   * @param {number} ownerId - Owner ID (for authorization)
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated booking
   */
  async updateBookingStatus(bookingId, ownerId, status) {
    const booking = await adminBookingRepository.findById(bookingId);

    if (!booking) {
      throw new ApiError(404, 'BOOKING_NOT_FOUND', 'Booking not found');
    }

    // Verify hotel ownership
    const isOwner = await adminBookingRepository.verifyHotelOwnership(booking.hotel_id, ownerId);

    if (!isOwner) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to update this booking');
    }

    // Validate status transition
    if (booking.status === status) {
      throw new ApiError(400, 'INVALID_STATUS', `Booking is already ${status}`);
    }

    // Update status
    const [updatedCount] = await adminBookingRepository.updateStatus(bookingId, status);

    if (updatedCount === 0) {
      throw new ApiError(500, 'UPDATE_FAILED', 'Failed to update booking status');
    }

    // Return updated booking
    return await this.getBookingById(bookingId, ownerId);
  }

  /**
   * Get booking statistics for a hotel
   * @param {number} hotelId - Hotel ID
   * @param {number} ownerId - Owner ID (for authorization)
   * @param {Date} startDate - Start date for statistics
   * @param {Date} endDate - End date for statistics
   * @returns {Promise<Object>} Booking statistics
   */
  async getBookingStatistics(hotelId, ownerId, startDate, endDate) {
    // Verify hotel ownership
    const isOwner = await adminBookingRepository.verifyHotelOwnership(hotelId, ownerId);

    if (!isOwner) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to access this hotel');
    }

    return await adminBookingRepository.getBookingStatistics(hotelId, startDate, endDate);
  }
}

module.exports = new AdminBookingService();
