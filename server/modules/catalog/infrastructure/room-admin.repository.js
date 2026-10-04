const { rooms: Rooms } = require('@platform/database');

/**
 * Catalog room repository - read access to room metadata.
 * Inventory needs room_id/quantity/hotel context to manage availability.
 */
class RoomRepository {
  async create(data) {
    return await Rooms.create({
      room_name: data.roomName,
      max_guests: data.maxGuests,
      hotel_id: data.hotelId,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  async findByHotelId(hotelId) {
    return await Rooms.findAll({
      where: { hotel_id: hotelId },
      attributes: ['id', 'hotel_id', 'room_name', 'room_type', 'quantity', 'max_guests', 'status'],
      order: [['room_name', 'ASC']],
    });
  }

  async findById(roomId) {
    return await Rooms.findOne({
      where: { id: roomId },
      attributes: ['id', 'hotel_id', 'room_name', 'room_type', 'quantity', 'max_guests', 'status'],
    });
  }

  async findByIdAndHotelId(roomId, hotelId) {
    return await Rooms.findOne({
      where: { id: roomId, hotel_id: hotelId },
      attributes: ['id', 'hotel_id', 'room_name', 'room_type', 'quantity', 'max_guests', 'status'],
    });
  }
}

module.exports = new RoomRepository();
