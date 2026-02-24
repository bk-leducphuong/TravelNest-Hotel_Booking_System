const { Op } = require('sequelize');

const { Hotels, Rooms, RoomInventories } = require('../models/index.js');

/**
 * Join Repository - Contains all database operations for partner registration
 * Only repositories may import Sequelize models
 */

class JoinRepository {
  /**
   * Create or update hotel (upsert)
   */
  async upsertHotel(hotelData) {
    return await Hotels.upsert(
      {
        owner_id: hotelData.ownerId,
        name: hotelData.name,
        address: hotelData.address,
        city: hotelData.city,
        latitude: hotelData.latitude,
        longitude: hotelData.longitude,
        overall_rating: hotelData.rating,
        check_in_time: hotelData.checkInTime,
        check_out_time: hotelData.checkOutTime,
        hotel_amenities: hotelData.amenities,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        returning: true,
      }
    );
  }

  /**
   * Create room
   */
  async createRoom(roomData) {
    return await Rooms.create({
      room_name: roomData.roomName,
      max_guests: roomData.maxGuests,
      hotel_id: roomData.hotelId,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Create room inventory entries in bulk
   */
  async createRoomInventories(inventoryEntries) {
    return await RoomInventories.bulkCreate(inventoryEntries);
  }

  /**
   * Update room with image URLs
   */
  async updateRoomImages(roomId, imageUrls) {
    return await Rooms.update(
      { image_urls: imageUrls },
      {
        where: { room_id: roomId },
      }
    );
  }

  /**
   * Find hotel by owner ID
   */
  async findHotelByOwnerId(ownerId) {
    return await Hotels.findOne({
      where: { owner_id: ownerId },
    });
  }

  /**
   * Find room by ID
   */
  async findRoomById(roomId) {
    return await Rooms.findOne({
      where: { room_id: roomId },
    });
  }

  /**
   * Find room by ID and hotel ID (for authorization)
   */
  async findRoomByIdAndHotelId(roomId, hotelId) {
    return await Rooms.findOne({
      where: {
        room_id: roomId,
        hotel_id: hotelId,
      },
    });
  }
}

module.exports = new JoinRepository();
