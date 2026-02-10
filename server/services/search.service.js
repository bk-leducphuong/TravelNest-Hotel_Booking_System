const searchRepository = require('../repositories/search.repository');
const ApiError = require('../utils/ApiError');

/**
 * Search Service - Contains main business logic
 * Follows RESTful API standards
 */

class SearchService {
  /**
   * Search hotels by location and availability
   * @param {Object} searchParams - Search parameters
   * @param {string} searchParams.location - City/location name
   * @param {number} searchParams.adults - Number of adults
   * @param {number} searchParams.children - Number of children
   * @param {string} searchParams.checkInDate - Check-in date (ISO format)
   * @param {string} searchParams.checkOutDate - Check-out date (ISO format)
   * @param {number} searchParams.rooms - Number of rooms needed
   * @param {number} searchParams.numberOfDays - Number of days
   * @returns {Promise<Array>} Array of hotels with lowest prices
   */
  async searchHotels(searchParams) {
    const {
      location,
      adults,
      children,
      checkInDate,
      checkOutDate,
      rooms,
      numberOfDays,
    } = searchParams;

    // Validate required parameters
    if (
      !location ||
      !adults ||
      !children ||
      !checkInDate ||
      !checkOutDate ||
      !rooms
    ) {
      throw new ApiError(
        400,
        'MISSING_SEARCH_CRITERIA',
        'Missing required search criteria: location, adults, children, checkInDate, checkOutDate, and rooms are required'
      );
    }

    // Validate dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    if (checkOut <= checkIn) {
      throw new ApiError(
        400,
        'INVALID_DATE_RANGE',
        'checkOutDate must be after checkInDate'
      );
    }

    // Calculate total guests
    const totalGuests = parseInt(adults, 10) + parseInt(children, 10);
    if (totalGuests <= 0) {
      throw new ApiError(
        400,
        'INVALID_GUEST_COUNT',
        'Total number of guests must be greater than 0'
      );
    }

    // Calculate number of days if not provided
    const calculatedDays =
      numberOfDays || Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    // Search hotels
    const hotels = await searchRepository.searchHotelsByLocation({
      location,
      totalGuests,
      checkInDate,
      checkOutDate,
      rooms: parseInt(rooms, 10),
      numberOfDays: calculatedDays,
    });

    if (hotels.length === 0) {
      return [];
    }

    // Get lowest price for each hotel
    const hotelsWithPrices = await Promise.all(
      hotels.map(async (hotel) => {
        const lowestPrice = await searchRepository.getLowestPriceForHotel(
          hotel.id,
          checkInDate,
          checkOutDate
        );

        return {
          hotel_id: hotel.id,
          name: hotel.name,
          address: hotel.address,
          city: hotel.city,
          overall_rating: hotel.overall_rating
            ? parseFloat(hotel.overall_rating)
            : null,
          hotel_class: hotel.hotel_class,
          image_urls: hotel.image_urls,
          latitude: hotel.latitude,
          longitude: hotel.longitude,
          lowestPrice,
        };
      })
    );

    return hotelsWithPrices;
  }

  /**
   * Save search information to search logs
   * @param {Object} searchData - Search data
   * @param {string} searchData.location - City/location name
   * @param {number} searchData.adults - Number of adults
   * @param {number} searchData.children - Number of children
   * @param {string} searchData.checkInDate - Check-in date (ISO format)
   * @param {string} searchData.checkOutDate - Check-out date (ISO format)
   * @param {number} searchData.rooms - Number of rooms needed
   * @param {number} searchData.numberOfDays - Number of days
   * @param {number} userId - User ID (optional, for authenticated users)
   * @returns {Promise<Object>} Created search log
   */
  async saveSearchInformation(searchData, userId = null) {
    const {
      location,
      checkInDate,
      checkOutDate,
      adults,
      children,
      rooms,
      numberOfDays,
    } = searchData;

    // Validate required parameters
    if (
      !location ||
      !checkInDate ||
      !checkOutDate ||
      !adults ||
      !children ||
      !rooms ||
      !numberOfDays
    ) {
      throw new ApiError(
        400,
        'MISSING_SEARCH_DETAILS',
        'Missing required search details: location, checkInDate, checkOutDate, adults, children, rooms, and numberOfDays are required'
      );
    }

    // Validate dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    if (checkOut <= checkIn) {
      throw new ApiError(
        400,
        'INVALID_DATE_RANGE',
        'checkOutDate must be after checkInDate'
      );
    }

    // Create search log
    const searchLog = await searchRepository.createSearchLog({
      location,
      userId,
      checkInDate,
      checkOutDate,
      adults: parseInt(adults, 10),
      children: parseInt(children, 10),
      rooms: parseInt(rooms, 10),
      numberOfDays: parseInt(numberOfDays, 10),
    });

    return searchLog.toJSON ? searchLog.toJSON() : searchLog;
  }
}

module.exports = new SearchService();
