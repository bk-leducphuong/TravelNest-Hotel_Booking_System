const { Rooms, RoomInventories, Amenities, Images, ImageVariants } = require('../models/index.js');

/**
 * Room Repository - Contains all database operations for rooms
 * Only repositories may import Sequelize models
 */

class RoomRepository {
  /**
   * Find available rooms for a hotel with date range and filters
   * Uses Sequelize ORM with proper associations
   */
  async findAvailableRooms(hotelId, checkInDate, checkOutDate, options = {}) {
    const { numberOfRooms = 1, numberOfNights, numberOfGuests, limit, offset } = options;

    const sequelize = require('../config/database.config');
    const { Op } = require('sequelize');

    // Build subquery for room inventory aggregation
    const inventorySubquery = `(
      SELECT 
        ri.room_id,
        SUM(ri.price_per_night) AS total_price,
        MIN(ri.total_rooms - ri.booked_rooms - COALESCE(ri.held_rooms, 0)) AS available_rooms
      FROM room_inventory AS ri
      WHERE 
        ri.date BETWEEN :checkInDate AND :checkOutDate
        AND ri.status = 'open'
      GROUP BY ri.room_id
      HAVING COUNT(CASE WHEN (ri.total_rooms - ri.booked_rooms - COALESCE(ri.held_rooms, 0)) >= :numberOfRooms THEN 1 END) = :numberOfNights
    )`;

    // Build where conditions
    const whereConditions = {
      hotel_id: hotelId,
      status: 'active',
    };

    if (numberOfGuests) {
      whereConditions.max_guests = {
        [Op.gte]: numberOfGuests,
      };
    }

    // Query rooms with inventory data
    const rooms = await Rooms.findAll({
      attributes: [
        'id',
        'room_name',
        'max_guests',
        'room_size',
        'room_type',
        'quantity',
        [
          sequelize.literal(`(
            SELECT SUM(ri.price_per_night) 
            FROM room_inventory AS ri 
            WHERE ri.room_id = rooms.id 
            AND ri.date BETWEEN '${checkInDate}' AND '${checkOutDate}'
            AND ri.status = 'open'
          )`),
          'price_per_night',
        ],
        [
          sequelize.literal(`(
            SELECT MIN(ri.total_rooms - ri.booked_rooms - COALESCE(ri.held_rooms, 0))
            FROM room_inventory AS ri 
            WHERE ri.room_id = rooms.id 
            AND ri.date BETWEEN '${checkInDate}' AND '${checkOutDate}'
            AND ri.status = 'open'
          )`),
          'available_rooms',
        ],
      ],
      where: {
        ...whereConditions,
        id: {
          [Op.in]: sequelize.literal(`(
            SELECT ri.room_id
            FROM room_inventory AS ri
            WHERE 
              ri.date BETWEEN '${checkInDate}' AND '${checkOutDate}'
              AND ri.status = 'open'
            GROUP BY ri.room_id
            HAVING COUNT(CASE WHEN (ri.total_rooms - ri.booked_rooms - COALESCE(ri.held_rooms, 0)) >= ${numberOfRooms} THEN 1 END) = ${numberOfNights}
          )`),
        },
      },
      include: [
        {
          model: Amenities,
          as: 'amenities',
          attributes: ['id', 'code', 'name', 'icon', 'category'],
          through: { attributes: [] },
          required: false,
        },
        {
          model: Images,
          as: 'images',
          where: { status: 'active' },
          attributes: [
            'id',
            'bucket_name',
            'object_key',
            'original_filename',
            'width',
            'height',
            'is_primary',
            'display_order',
          ],
          required: false,
          separate: true,
          order: [
            ['is_primary', 'DESC'],
            ['display_order', 'ASC'],
          ],
          include: [
            {
              model: ImageVariants,
              as: 'image_variants',
              attributes: ['id', 'variant_type', 'bucket_name', 'object_key', 'width', 'height'],
              required: false,
            },
          ],
        },
      ],
      limit: limit || undefined,
      offset: offset || undefined,
      subQuery: false,
    });

    return rooms.map((room) => {
      const roomData = room.toJSON();
      return {
        room_id: roomData.id,
        room_name: roomData.room_name,
        max_guests: roomData.max_guests,
        room_size: roomData.room_size,
        room_type: roomData.room_type,
        price_per_night: roomData.price_per_night || 0,
        available_rooms: roomData.available_rooms || 0,
        room_amenities: roomData.amenities || [],
        room_image_urls: roomData.images || [],
      };
    });
  }

  /**
   * Find room by ID with associations
   */
  async findById(roomId) {
    return await Rooms.findOne({
      where: { id: roomId, status: 'active' },
      attributes: [
        'id',
        'hotel_id',
        'room_name',
        'max_guests',
        'room_size',
        'room_type',
        'quantity',
        'status',
      ],
      include: [
        {
          model: Amenities,
          as: 'amenities',
          attributes: ['id', 'code', 'name', 'icon', 'category'],
          through: { attributes: [] },
          required: false,
        },
        {
          model: Images,
          as: 'images',
          where: { status: 'active' },
          attributes: [
            'id',
            'bucket_name',
            'object_key',
            'original_filename',
            'width',
            'height',
            'is_primary',
            'display_order',
          ],
          required: false,
          order: [
            ['is_primary', 'DESC'],
            ['display_order', 'ASC'],
          ],
          include: [
            {
              model: ImageVariants,
              as: 'image_variants',
              attributes: ['id', 'variant_type', 'bucket_name', 'object_key', 'width', 'height'],
              required: false,
            },
          ],
        },
      ],
    });
  }

  /**
   * Find rooms by hotel ID
   */
  async findByHotelId(hotelId) {
    return await Rooms.findAll({
      where: { hotel_id: hotelId, status: 'active' },
      attributes: ['id', 'room_name', 'max_guests', 'room_size', 'room_type', 'quantity', 'status'],
      include: [
        {
          model: Amenities,
          as: 'amenities',
          attributes: ['id', 'code', 'name', 'icon', 'category'],
          through: { attributes: [] },
          required: false,
        },
        {
          model: Images,
          as: 'images',
          where: { status: 'active' },
          attributes: [
            'id',
            'bucket_name',
            'object_key',
            'original_filename',
            'width',
            'height',
            'is_primary',
            'display_order',
          ],
          required: false,
          order: [
            ['is_primary', 'DESC'],
            ['display_order', 'ASC'],
          ],
          include: [
            {
              model: ImageVariants,
              as: 'image_variants',
              attributes: ['id', 'variant_type', 'bucket_name', 'object_key', 'width', 'height'],
              required: false,
            },
          ],
        },
      ],
    });
  }
}

module.exports = new RoomRepository();
