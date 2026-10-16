const ApiError = require('@utils/ApiError');
const sequelize = require('@config/database.config');
const { auditService } = require('@platform/audit');

const hotelRepository = require('../../infrastructure/hotel.repository');
const roomRepository = require('../../infrastructure/room-admin.repository');

/**
 * Replace a room's amenity assignments. Scoped to the hotel; audited and
 * transactional.
 */
async function setRoomAmenities(
  hotelId,
  roomId,
  { amenityIds = [] } = {},
  { actorUserId, requestId } = {}
) {
  const room = await roomRepository.findByIdAndHotelId(roomId, hotelId);

  if (!room) {
    throw new ApiError(404, 'ROOM_NOT_FOUND', 'Room not found');
  }

  const before = await hotelRepository.findRoomAmenityIds(roomId);

  await sequelize.transaction(async (transaction) => {
    await hotelRepository.setRoomAmenities(roomId, amenityIds, { transaction });
  });

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'room.amenities_updated',
    entityType: 'room',
    entityId: roomId,
    hotelId,
    before: { amenityIds: before },
    after: { amenityIds },
    requestId,
  });

  return { hotelId, roomId, amenityIds };
}

module.exports = { setRoomAmenities };
