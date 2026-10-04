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
      ...(data.roomType !== undefined ? { room_type: data.roomType } : {}),
      ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
      ...(data.roomSize !== undefined ? { room_size: data.roomSize } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  async update(roomId, values) {
    return await Rooms.update({ ...values, updated_at: new Date() }, { where: { id: roomId } });
  }

  /** Soft delete: rooms are referenced by inventory/bookings, so never hard-delete. */
  async deactivate(roomId) {
    return await Rooms.update(
      { status: 'inactive', updated_at: new Date() },
      { where: { id: roomId } }
    );
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
