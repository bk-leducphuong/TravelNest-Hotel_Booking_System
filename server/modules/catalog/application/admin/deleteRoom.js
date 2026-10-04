const ApiError = require('@utils/ApiError');
const { auditService } = require('@platform/audit');

const roomRepository = require('../../infrastructure/room-admin.repository');

/**
 * Soft-delete a room (mark inactive). Rooms are referenced by inventory and
 * booking rows, so we never hard-delete. Scoped to the hotel. Audited.
 */
async function deleteRoom(hotelId, roomId, { actorUserId, requestId } = {}) {
  const existing = await roomRepository.findByIdAndHotelId(roomId, hotelId);

  if (!existing) {
    throw new ApiError(404, 'ROOM_NOT_FOUND', 'Room not found');
  }

  await roomRepository.deactivate(roomId);

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'room.deleted',
    entityType: 'room',
    entityId: roomId,
    hotelId,
    before: existing.toJSON ? existing.toJSON() : existing,
    after: { status: 'inactive' },
    requestId,
  });

  return { roomId, hotelId };
}

module.exports = { deleteRoom };
