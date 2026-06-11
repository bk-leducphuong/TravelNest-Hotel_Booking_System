const mediaProxyService = require('@services/mediaProxy.service');
const joinRepository = require('../repositories/join.repository');
const ApiError = require('../utils/ApiError');

/**
 * Join Service - Contains main business logic for partner registration
 * Follows RESTful API standards
 */

class JoinService {
  /**
   * Submit join form (become a partner)
   * Creates or updates hotel, creates room, and initializes room inventory
   * @param {number} ownerId - User ID (owner)
   * @param {Object} joinFormData - Join form data
   * @returns {Promise<Object>} Created hotel and room information
   */
  async submitJoinForm(ownerId, joinFormData) {
    const {
      hotelName,
      streetName,
      city,
      coordinates,
      rating,
      checkInFrom,
      checkInTo,
      checkOutFrom,
      checkOutTo,
      services,
      roomDetails,
    } = joinFormData;

    // Validate required fields
    if (
      !hotelName ||
      !streetName ||
      !city ||
      !coordinates ||
      !coordinates.latitude ||
      !coordinates.longitude ||
      !roomDetails ||
      !roomDetails.roomType ||
      !roomDetails.numberOfGuests ||
      !roomDetails.numberOfRooms
    ) {
      throw new ApiError(
        400,
        'MISSING_REQUIRED_FIELDS',
        'Missing required fields in join form data'
      );
    }

    // Validate coordinates
    const lat = parseFloat(coordinates.latitude);
    const lng = parseFloat(coordinates.longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw new ApiError(400, 'INVALID_LATITUDE', 'Latitude must be between -90 and 90');
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      throw new ApiError(400, 'INVALID_LONGITUDE', 'Longitude must be between -180 and 180');
    }

    // Validate number of rooms
    const numberOfRooms = parseInt(roomDetails.numberOfRooms, 10);
    if (isNaN(numberOfRooms) || numberOfRooms <= 0) {
      throw new ApiError(
        400,
        'INVALID_NUMBER_OF_ROOMS',
        'Number of rooms must be a positive integer'
      );
    }

    // Validate number of guests
    const numberOfGuests = parseInt(roomDetails.numberOfGuests, 10);
    if (isNaN(numberOfGuests) || numberOfGuests <= 0) {
      throw new ApiError(
        400,
        'INVALID_NUMBER_OF_GUESTS',
        'Number of guests must be a positive integer'
      );
    }

    // Create or update hotel
    const [hotel, created] = await joinRepository.upsertHotel({
      ownerId,
      name: hotelName.trim(),
      address: streetName.trim(),
      city: city.trim(),
      latitude: lat.toString(),
      longitude: lng.toString(),
      rating: rating ? parseFloat(rating) : null,
      checkInTime: `${checkInFrom}-${checkInTo}`,
      checkOutTime: `${checkOutFrom}-${checkOutTo}`,
      amenities: services ? JSON.stringify(services) : null,
    });

    // Extract hotel ID from Sequelize instance
    const hotelId = hotel.id || hotel.get?.('id') || hotel.dataValues?.id || hotel.hotel_id;

    // Create room
    const room = await joinRepository.createRoom({
      roomName: roomDetails.roomType.trim(),
      maxGuests: numberOfGuests,
      hotelId,
    });

    // Extract room ID from Sequelize instance
    const roomId = room.id || room.get?.('id') || room.dataValues?.id || room.room_id;

    // Create room inventory entries for next 60 days
    const inventoryEntries = Array.from({ length: 60 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      return {
        room_id: roomId,
        date: date.toISOString().split('T')[0], // YYYY-MM-DD format
        total_rooms: numberOfRooms,
        booked_rooms: 0,
        price_per_night: 0,
        status: 'open',
      };
    });

    await joinRepository.createRoomInventories(inventoryEntries);

    return {
      hotel_id: hotelId,
      room_id: roomId,
      created: created || false,
    };
  }

  /**
   * Upload and process hotel/room photos
   * @param {number} hotelId - Hotel ID
   * @param {number} roomId - Room ID
   * @param {Array<object>} files - Array of multer files
   * @returns {Promise<Array>} Array of uploaded image URLs
   */
  async uploadPhotos(hotelId, roomId, files) {
    if (!files || files.length === 0) {
      throw new ApiError(400, 'NO_FILES_UPLOADED', 'No files uploaded');
    }
    const result = await mediaProxyService.uploadJoinPhotos(hotelId, roomId, files);
    return result.imageUrls;
  }
}

module.exports = new JoinService();
