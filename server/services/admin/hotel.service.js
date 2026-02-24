const adminHotelRepository = require('../../repositories/admin/hotel.repository');
const ApiError = require('../../utils/ApiError');

/**
 * Admin Hotel Service - Contains main business logic for admin hotel management
 * Follows RESTful API standards
 */

class AdminHotelService {
  /**
   * Get all hotels owned by the admin
   * @param {number} ownerId - Owner ID
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.limit - Items per page
   * @returns {Promise<Object>} Paginated hotels with metadata
   */
  async getAllHotels(ownerId, options = {}) {
    const result = await adminHotelRepository.findByOwnerId(ownerId, options);

    // Enrich with statistics
    const enrichedHotels = await Promise.all(
      result.hotels.map(async (hotel) => {
        const hotelData = hotel.toJSON ? hotel.toJSON() : hotel;
        const stats = await adminHotelRepository.getHotelStatistics(hotelData.hotel_id);

        return {
          ...hotelData,
          statistics: stats,
        };
      })
    );

    return {
      hotels: enrichedHotels,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: options.limit || 20,
      },
    };
  }

  /**
   * Get a specific hotel by ID
   * @param {number} hotelId - Hotel ID
   * @param {number} ownerId - Owner ID (for authorization)
   * @returns {Promise<Object>} Hotel details with rooms and statistics
   */
  async getHotelById(hotelId, ownerId) {
    const hotel = await adminHotelRepository.findByIdAndOwnerId(hotelId, ownerId);

    if (!hotel) {
      throw new ApiError(
        404,
        'HOTEL_NOT_FOUND',
        'Hotel not found or you do not have permission to access it'
      );
    }

    // Get hotel statistics
    const statistics = await adminHotelRepository.getHotelStatistics(hotelId);

    // Get all rooms
    const rooms = await adminHotelRepository.getRoomsByHotelId(hotelId);

    const hotelData = hotel.toJSON ? hotel.toJSON() : hotel;

    return {
      ...hotelData,
      statistics,
      rooms: rooms.map((room) => (room.toJSON ? room.toJSON() : room)),
    };
  }

  /**
   * Update hotel information
   * @param {number} hotelId - Hotel ID
   * @param {number} ownerId - Owner ID (for authorization)
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated hotel
   */
  async updateHotel(hotelId, ownerId, updateData) {
    // Verify hotel ownership
    const hotel = await adminHotelRepository.findByIdAndOwnerId(hotelId, ownerId);

    if (!hotel) {
      throw new ApiError(
        404,
        'HOTEL_NOT_FOUND',
        'Hotel not found or you do not have permission to update it'
      );
    }

    // Update hotel
    const [updatedCount] = await adminHotelRepository.update(hotelId, updateData);

    if (updatedCount === 0) {
      throw new ApiError(500, 'UPDATE_FAILED', 'Failed to update hotel');
    }

    // Return updated hotel
    return await this.getHotelById(hotelId, ownerId);
  }
}

module.exports = new AdminHotelService();
