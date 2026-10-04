const ApiError = require('@utils/ApiError');
const { auditService } = require('@platform/audit');

const hotelRepository = require('../../infrastructure/hotel.repository');
const roomRepository = require('../../infrastructure/room-admin.repository');

/**
 * Create a room for a hotel. Audited.
 */
async function createRoom(hotelId, payload = {}, { actorUserId, requestId } = {}) {
  const hotel = await hotelRepository.findByIdForAdmin(hotelId);

  if (!hotel) {
    throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
  }

  const room = await roomRepository.create({
    hotelId,
    roomName: payload.roomName,
    roomType: payload.roomType,
    maxGuests: payload.maxGuests,
    quantity: payload.quantity,
    roomSize: payload.roomSize,
    status: payload.status,
  });

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'room.created',
    entityType: 'room',
    entityId: room.id,
    hotelId,
    after: room.toJSON ? room.toJSON() : room,
    requestId,
  });

  return { room };
}

module.exports = { createRoom };
