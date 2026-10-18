const ApiError = require('@utils/ApiError');
const { auditService } = require('@platform/audit');

const hotelRepository = require('../../infrastructure/hotel.repository');
const roomRepository = require('../../infrastructure/room-admin.repository');

/**
 * Create a cancellation rule. `roomId` null => hotel-wide default. When a room
 * is given it must belong to the hotel.
 */
async function createCancellationRule(hotelId, payload = {}, { actorUserId, requestId } = {}) {
  const hotel = await hotelRepository.findByIdForAdmin(hotelId);

  if (!hotel) {
    throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
  }

  if (payload.roomId) {
    const room = await roomRepository.findByIdAndHotelId(payload.roomId, hotelId);
    if (!room) {
      throw new ApiError(400, 'ROOM_NOT_IN_HOTEL', 'Room does not belong to this hotel');
    }
  }

  const rule = await hotelRepository.createCancellationRule({ hotelId, ...payload });

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'cancellation_rule.created',
    entityType: 'hotel_cancellation_rule',
    entityId: rule.id,
    hotelId,
    after: rule.toJSON ? rule.toJSON() : rule,
    requestId,
  });

  return { rule };
}

module.exports = { createCancellationRule };
