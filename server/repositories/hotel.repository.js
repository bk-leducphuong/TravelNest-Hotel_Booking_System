const {
  Hotels,
  Rooms,
  Reviews,
  NearbyPlaces,
  ReviewCriterias,
  RoomInventories,
  Users,
  HotelPolicies,
} = require('../models/index.js');

/**
 * Hotel Repository - Contains all database operations for hotels
 * Only repositories may import Sequelize models
 */

class HotelRepository {
  /**
   * Find hotel by ID with basic information
   */
  async findById(hotelId) {
    return await Hotels.findOne({
      where: { id: hotelId },
      attributes: [
        'id',
        'name',
        'description',
        'address',
        'city',
        'phone_number',
        'overall_rating',
        'latitude',
        'longitude',
        'image_urls',
        'hotel_class',
        'hotel_amenities',
        'check_in_time',
        'check_out_time',
      ],
    });
  }

  /**
   * Find available rooms for a hotel with date range and filters
   * Uses raw query for complex aggregation
   */
  async findAvailableRooms(hotelId, checkInDate, checkOutDate, options = {}) {
    const {
      numberOfRooms = 1,
      numberOfDays,
      numberOfGuests,
      limit,
      offset,
    } = options;

    // Lazy load sequelize to avoid circular dependency
    const sequelize = require('../config/database.config');

    const query = `
      SELECT 
        r.room_id,
        r.room_name, 
        r.max_guests,
        r.image_urls AS room_image_urls, 
        r.room_amenities, 
        ri.price_per_night, 
        ri.available_rooms
      FROM rooms AS r
      JOIN (
        SELECT 
          ri.room_id,
          SUM(ri.price_per_night) AS price_per_night,
          MIN(ri.total_rooms - ri.booked_rooms - COALESCE(ri.held_rooms, 0)) AS available_rooms
        FROM room_inventory AS ri
        WHERE 
          ri.date BETWEEN ? AND ?
          AND ri.status = 'open'
        GROUP BY ri.room_id
        HAVING COUNT(CASE WHEN (ri.total_rooms - ri.booked_rooms - COALESCE(ri.held_rooms, 0)) >= ? THEN 1 END) = ?
      ) AS ri ON r.room_id = ri.room_id
      JOIN hotels AS h ON h.id = r.hotel_id
      WHERE h.id = ?
      ${numberOfGuests ? 'AND r.max_guests >= ?' : ''}
      ${limit ? 'LIMIT ?' : ''}
      ${offset ? 'OFFSET ?' : ''}
    `;

    const replacements = [
      checkInDate,
      checkOutDate,
      numberOfRooms,
      numberOfDays,
      hotelId,
    ];

    if (numberOfGuests) {
      replacements.push(numberOfGuests);
    }
    if (limit) {
      replacements.push(limit);
    }
    if (offset) {
      replacements.push(offset);
    }

    return await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });
  }

  /**
   * Find reviews for a hotel
   * Uses raw query to join with users table
   */
  async findReviewsByHotelId(hotelId, options = {}) {
    const { limit = 10, offset = 0 } = options;
    const sequelize = require('../config/database.config');

    const query = `
      SELECT 
        rv.review_id, 
        rv.user_id, 
        rv.rating, 
        rv.comment, 
        rv.created_at, 
        rv.booking_code, 
        users.username, 
        users.profile_picture_url, 
        users.country
      FROM reviews rv 
      JOIN users ON users.id = rv.user_id
      WHERE rv.hotel_id = ?
      ORDER BY rv.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as count
      FROM reviews rv 
      WHERE rv.hotel_id = ?
    `;

    const [reviews, countResult] = await Promise.all([
      sequelize.query(query, {
        replacements: [hotelId, limit, offset],
        type: sequelize.QueryTypes.SELECT,
      }),
      sequelize.query(countQuery, {
        replacements: [hotelId],
        type: sequelize.QueryTypes.SELECT,
      }),
    ]);

    return {
      rows: reviews,
      count: countResult[0]?.count || 0,
    };
  }

  /**
   * Find nearby places for a hotel
   */
  async findNearbyPlacesByHotelId(hotelId, options = {}) {
    const { category = null, limit = 20 } = options;

    const where = {
      hotel_id: hotelId,
      is_active: true,
    };

    if (category) {
      where.category = category;
    }

    return await NearbyPlaces.findAll({
      where,
      attributes: [
        'id',
        'name',
        'category',
        'description',
        'address',
        'latitude',
        'longitude',
        'distance_km',
        'travel_time_minutes',
        'travel_mode',
        'rating',
        'website_url',
        'phone_number',
        'opening_hours',
        'price_level',
        'icon',
      ],
      order: [
        ['display_order', 'ASC'],
        ['distance_km', 'ASC'],
      ],
      limit,
    });
  }

  /**
   * Find review criteria averages for a hotel
   */
  async findReviewCriteriasByHotelId(hotelId) {
    const sequelize = require('../config/database.config.js');

    const query = `
      SELECT
        rc.criteria_name,
        r.hotel_id,
        AVG(rc.score) AS average_score
      FROM
        review_criterias rc
      JOIN
        reviews r ON rc.review_id = r.review_id
      WHERE
        r.hotel_id = ?
      GROUP BY
        rc.criteria_name
    `;

    return await sequelize.query(query, {
      replacements: [hotelId],
      type: sequelize.QueryTypes.SELECT,
    });
  }

  /**
   * Check room availability for specific rooms
   */
  async checkRoomAvailability(
    hotelId,
    roomIds,
    checkInDate,
    checkOutDate,
    numberOfDays
  ) {
    const sequelize = require('../config/database.config.js');

    const query = `
      SELECT 
        MIN(ri.total_rooms - ri.booked_rooms) AS available_rooms,
        r.room_id
      FROM hotels h
      JOIN rooms r 
      ON h.id = r.hotel_id
      JOIN room_inventory ri 
      ON r.room_id = ri.room_id
      WHERE h.id = ?
      AND r.room_id IN (?)
      AND ri.date BETWEEN ? AND ?
      GROUP BY r.room_id
      HAVING COUNT(CASE WHEN ri.total_rooms - ri.booked_rooms >= 0 THEN 1 END) = ?
    `;

    return await sequelize.query(query, {
      replacements: [hotelId, roomIds, checkInDate, checkOutDate, numberOfDays],
      type: sequelize.QueryTypes.SELECT,
    });
  }

  /**
   * Find room by ID
   */
  async findRoomById(roomId) {
    return await Rooms.findOne({
      where: { id: roomId },
      attributes: [
        'id',
        'hotel_id',
        'room_name',
        'max_guests',
        'image_urls',
        'room_amenities',
        'room_size',
        'room_type',
        'quantity',
      ],
    });
  }

  /**
   * Find rooms by hotel ID
   */
  async findRoomsByHotelId(hotelId) {
    return await Rooms.findAll({
      where: { hotel_id: hotelId },
      attributes: [
        'room_id',
        'room_name',
        'max_guests',
        'image_urls',
        'room_amenities',
        'room_size',
        'room_type',
        'quantity',
      ],
    });
  }

  /**
   * Find policies for a hotel
   */
  async findPoliciesByHotelId(hotelId) {
    return await HotelPolicies.findAll({
      where: {
        hotel_id: hotelId,
        is_active: true,
      },
      attributes: [
        'id',
        'policy_type',
        'title',
        'description',
        'display_order',
        'icon',
      ],
      order: [['display_order', 'ASC']],
    });
  }

  /**
   * Find a specific nearby place by ID
   */
  async findNearbyPlaceById(placeId) {
    return await NearbyPlaces.findByPk(placeId);
  }

  /**
   * Get nearby places grouped by category
   */
  async findNearbyPlacesGroupedByCategory(hotelId) {
    const sequelize = require('../config/database.config.js');

    const query = `
      SELECT 
        category,
        COUNT(*) as place_count,
        MIN(distance_km) as min_distance,
        AVG(distance_km) as avg_distance
      FROM nearby_places
      WHERE hotel_id = ? AND is_active = true
      GROUP BY category
      ORDER BY category
    `;

    return await sequelize.query(query, {
      replacements: [hotelId],
      type: sequelize.QueryTypes.SELECT,
    });
  }
}

module.exports = new HotelRepository();
