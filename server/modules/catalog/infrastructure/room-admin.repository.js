const { rooms: Rooms } = require('@platform/database');

const ROOM_ADMIN_ATTRIBUTES = [
  'id',
  'hotel_id',
  'room_name',
  'room_type',
  'bed_type',
  'quantity',
  'max_guests',
  'room_size',
  'status',
];

/**
 * Catalog room repository - read access to room metadata.
 * Inventory needs room_id/quantity/hotel context to manage availability.
 */
class RoomRepository {
  async create(data, options = {}) {
    return await Rooms.create(
      {
        room_name: data.roomName,
        max_guests: data.maxGuests,
        hotel_id: data.hotelId,
        ...(data.roomType !== undefined ? { room_type: data.roomType } : {}),
        ...(data.bedType !== undefined ? { bed_type: data.bedType } : {}),
        ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
        ...(data.roomSize !== undefined ? { room_size: data.roomSize } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        created_at: new Date(),
        updated_at: new Date(),
      },
      options
    );
  }

  async update(roomId, values, options = {}) {
    return await Rooms.update(
      { ...values, updated_at: new Date() },
      { where: { id: roomId }, ...options }
    );
  }

  async findByHotelAndName(hotelId, roomName, options = {}) {
    return await Rooms.findOne({
      where: { hotel_id: hotelId, room_name: roomName },
      ...options,
    });
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
      attributes: ROOM_ADMIN_ATTRIBUTES,
      order: [['room_name', 'ASC']],
    });
  }

  async findById(roomId) {
    return await Rooms.findOne({
      where: { id: roomId },
      attributes: ROOM_ADMIN_ATTRIBUTES,
    });
  }

  async findByIdAndHotelId(roomId, hotelId) {
    return await Rooms.findOne({
      where: { id: roomId, hotel_id: hotelId },
      attributes: ROOM_ADMIN_ATTRIBUTES,
    });
  }
}

module.exports = new RoomRepository();
