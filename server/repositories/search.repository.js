const { Op } = require('sequelize');
const { Sequelize } = require('sequelize');

const {
  Hotels,
  Rooms,
  RoomInventories,
  SearchLogs,
  hotel_search_snapshots,
} = require('../models/index.js');
const sequelize = require('../config/database.config.js');

/**
 * Search Repository - Contains all database operations for search
 * Only repositories may import Sequelize models
 */

class SearchRepository {
  /**
   * Search hotels by location and availability
   * Uses raw query for complex search with availability checks
   */
  async searchHotelsByLocation(searchParams) {
    const { location, totalGuests, checkInDate, checkOutDate, rooms, numberOfDays } = searchParams;

    const query = `
      SELECT DISTINCT 
        h.hotel_id, 
        h.name, 
        h.address, 
        h.city, 
        h.overall_rating, 
        h.hotel_class, 
        h.image_urls, 
        h.latitude, 
        h.longitude
      FROM hotels h
      JOIN rooms r ON h.hotel_id = r.hotel_id
      JOIN room_inventory ri ON r.room_id = ri.room_id
      WHERE h.city = ?
        AND r.max_guests >= ?
        AND ri.date BETWEEN ? AND ?
        AND ri.status = 'open'
      GROUP BY 
        h.hotel_id, h.name, h.address, h.city, h.overall_rating, h.hotel_class, h.image_urls, 
        h.latitude, h.longitude, r.room_id, ri.price_per_night, r.max_guests, r.room_name
      HAVING COUNT(CASE WHEN ri.total_rooms - ri.booked_rooms >= ? THEN 1 END) = ?
    `;

    return await sequelize.query(query, {
      replacements: [location, totalGuests, checkInDate, checkOutDate, rooms, numberOfDays],
      type: sequelize.QueryTypes.SELECT,
    });
  }

  /**
   * Get lowest price for a hotel within date range
   */
  async getLowestPriceForHotel(hotelId, checkInDate, checkOutDate) {
    const result = await RoomInventories.findOne({
      attributes: [[Sequelize.fn('SUM', Sequelize.col('price_per_night')), 'total_price']],
      include: [
        {
          model: Rooms,
          required: true,
          where: {
            hotel_id: hotelId,
          },
        },
      ],
      where: {
        date: {
          [Op.between]: [checkInDate, checkOutDate],
        },
        status: 'open',
      },
      group: ['room_id'],
      order: [[Sequelize.fn('SUM', Sequelize.col('price_per_night')), 'ASC']],
      raw: true,
    });

    return result ? parseFloat(result.total_price) : null;
  }

  /**
   * Create search log
   */
  async createSearchLog(searchData) {
    const { location, userId, checkInDate, checkOutDate, adults, children, rooms } = searchData;

    return await SearchLogs.create({
      location,
      user_id: userId,
      search_time: Sequelize.literal('CURRENT_TIMESTAMP'),
      children,
      adults,
      rooms,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
    });
  }

  /**
   * Find hotels by city
   */
  async findHotelsByCity(city) {
    return await Hotels.findAll({
      where: { city },
      attributes: [
        'hotel_id',
        'name',
        'address',
        'city',
        'overall_rating',
        'hotel_class',
        'image_urls',
        'latitude',
        'longitude',
      ],
    });
  }

  /**
   * Check date-specific availability for hotels
   * Phase 2: Database availability check
   *
   * @param {Array<string>} hotelIds - Candidate hotel IDs from ES
   * @param {string} checkIn - Check-in date (ISO format)
   * @param {string} checkOut - Check-out date (ISO format)
   * @param {number} requiredRooms - Number of rooms needed
   * @param {number} totalGuests - Total number of guests
   * @returns {Promise<Array>} Hotels with availability
   */
  async checkDateRangeAvailability(params) {
    const { hotelIds, checkIn, checkOut, requiredRooms, totalGuests } = params;

    if (!hotelIds || hotelIds.length === 0) {
      return [];
    }

    // Calculate total nights
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const totalNights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    // Query to find hotels with availability for ALL dates in range
    const query = `
      SELECT 
        r.hotel_id,
        COUNT(DISTINCT ri.date) as available_dates,
        MIN(ri.price_per_night) as min_price_per_night,
        SUM(ri.total_rooms - ri.booked_rooms) as total_available_rooms
      FROM rooms r
      JOIN room_inventory ri ON r.id = ri.room_id
      WHERE 
        r.hotel_id IN (:hotelIds)
        AND ri.date >= :checkIn
        AND ri.date < :checkOut
        AND ri.status = 'open'
        AND (ri.total_rooms - ri.booked_rooms) >= :requiredRooms
        AND r.max_guests >= :totalGuests
      GROUP BY r.hotel_id
      HAVING COUNT(DISTINCT ri.date) = :totalNights
    `;

    const results = await sequelize.query(query, {
      replacements: {
        hotelIds,
        checkIn,
        checkOut,
        requiredRooms,
        totalGuests,
        totalNights,
      },
      type: sequelize.QueryTypes.SELECT,
    });

    return results;
  }

  /**
   * Get available room types for a hotel with pricing
   * Phase 3: Room type & capacity validation
   *
   * @param {string} hotelId - Hotel ID
   * @param {string} checkIn - Check-in date
   * @param {string} checkOut - Check-out date
   * @param {number} requiredRooms - Number of rooms needed
   * @param {number} totalGuests - Total guests
   * @returns {Promise<Array>} Available rooms with pricing
   */
  async getAvailableRoomsForHotel(params) {
    const { hotelId, checkIn, checkOut, requiredRooms, totalGuests } = params;

    // Calculate total nights
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const totalNights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

    const query = `
      SELECT 
        r.id as room_id,
        r.room_type,
        r.max_guests,
        r.bed_type,
        r.room_size,
        SUM(ri.price_per_night) as total_price,
        AVG(ri.price_per_night) as avg_price_per_night,
        MIN(ri.total_rooms - ri.booked_rooms) as min_available_rooms,
        COUNT(DISTINCT ri.date) as available_dates
      FROM rooms r
      JOIN room_inventory ri ON r.id = ri.room_id
      WHERE 
        r.hotel_id = :hotelId
        AND ri.date >= :checkIn
        AND ri.date < :checkOut
        AND ri.status = 'open'
        AND (ri.total_rooms - ri.booked_rooms) >= :requiredRooms
        AND r.max_guests >= :totalGuests
      GROUP BY r.id, r.room_type, r.max_guests, r.bed_type, r.room_size
      HAVING COUNT(DISTINCT ri.date) = :totalNights
      ORDER BY total_price ASC
    `;

    const rooms = await sequelize.query(query, {
      replacements: {
        hotelId,
        checkIn,
        checkOut,
        requiredRooms,
        totalGuests,
        totalNights,
      },
      type: sequelize.QueryTypes.SELECT,
    });

    return rooms.map((room) => ({
      room_id: room.room_id,
      room_type: room.room_type,
      max_guests: room.max_guests,
      bed_type: room.bed_type,
      room_size: room.room_size,
      price_per_night: parseFloat(room.avg_price_per_night),
      total_price: parseFloat(room.total_price),
      available_rooms: room.min_available_rooms,
      nights: totalNights,
    }));
  }

  /**
   * Get hotel details from snapshot
   *
   * @param {Array<string>} hotelIds - Hotel IDs
   * @returns {Promise<Array>} Hotel details
   */
  async getHotelDetailsByIds(hotelIds) {
    if (!hotelIds || hotelIds.length === 0) {
      return [];
    }

    return await hotel_search_snapshots.findAll({
      where: {
        hotel_id: {
          [Op.in]: hotelIds,
        },
      },
      raw: true,
    });
  }

  /**
   * Fallback: Search hotels directly from database
   * Used when Elasticsearch is unavailable
   *
   * @param {Object} params - Search parameters
   * @returns {Promise<Array>} Hotels
   */
  async searchHotelsFromDatabase(params) {
    const { city, country, minPrice, maxPrice, minRating, hotelClass, limit = 200 } = params;

    const where = {
      status: 'active',
      is_available: true,
      has_available_rooms: true,
    };

    if (city) {
      where.city = { [Op.like]: `%${city}%` };
    }

    if (country) {
      where.country = country;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.min_price = {};
      if (minPrice !== undefined) where.min_price[Op.gte] = minPrice;
      if (maxPrice !== undefined) where.min_price[Op.lte] = maxPrice;
    }

    if (minRating !== undefined) {
      where.avg_rating = { [Op.gte]: minRating };
    }

    if (hotelClass && hotelClass.length > 0) {
      where.hotel_class = { [Op.in]: hotelClass };
    }

    return await hotel_search_snapshots.findAll({
      where,
      limit,
      order: [
        ['avg_rating', 'DESC'],
        ['review_count', 'DESC'],
      ],
      raw: true,
    });
  }
}

module.exports = new SearchRepository();
