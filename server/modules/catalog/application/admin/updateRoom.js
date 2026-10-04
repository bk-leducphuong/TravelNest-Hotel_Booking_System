const ApiError = require('@utils/ApiError');
const { auditService } = require('@platform/audit');

const roomRepository = require('../../infrastructure/room-admin.repository');

/** Input field -> rooms column. Only these are editable through the back-office. */
const EDITABLE_FIELDS = {
  roomName: 'room_name',
  roomType: 'room_type',
  maxGuests: 'max_guests',
  quantity: 'quantity',
  roomSize: 'room_size',
  status: 'status',
};

/**
 * Update a room's editable fields. Scoped to the hotel. Audited.
 */
async function updateRoom(hotelId, roomId, payload = {}, { actorUserId, requestId } = {}) {
  const existing = await roomRepository.findByIdAndHotelId(roomId, hotelId);

  if (!existing) {
    throw new ApiError(404, 'ROOM_NOT_FOUND', 'Room not found');
  }

  const values = {};
  for (const [input, column] of Object.entries(EDITABLE_FIELDS)) {
    if (payload[input] !== undefined) {
      values[column] = payload[input];
    }
  }

  if (Object.keys(values).length === 0) {
    throw new ApiError(
      400,
      'NO_ROOM_CHANGES',
      `No editable fields provided (${Object.keys(EDITABLE_FIELDS).join(', ')})`
    );
  }

  await roomRepository.update(roomId, values);

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'room.updated',
    entityType: 'room',
    entityId: roomId,
    hotelId,
    before: existing.toJSON ? existing.toJSON() : existing,
    after: values,
    requestId,
  });

  const room = await roomRepository.findByIdAndHotelId(roomId, hotelId);
  return { room };
}

module.exports = { updateRoom, EDITABLE_FIELDS };
