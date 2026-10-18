const ApiError = require('@utils/ApiError');
const sequelize = require('@config/database.config');
const { auditService } = require('@platform/audit');

const hotelRepository = require('../../infrastructure/hotel.repository');

/**
 * Replace the hotel's amenity assignments. Audited; runs in a transaction so a
 * failed bulk insert does not leave the hotel without amenities.
 */
async function setHotelAmenities(
  hotelId,
  { amenityIds = [] } = {},
  { actorUserId, requestId } = {}
) {
  const hotel = await hotelRepository.findByIdForAdmin(hotelId);

  if (!hotel) {
    throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
  }

  const before = await hotelRepository.findHotelAmenityIds(hotelId);

  await sequelize.transaction(async (transaction) => {
    await hotelRepository.setHotelAmenities(hotelId, amenityIds, { transaction });
  });

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'hotel.amenities_updated',
    entityType: 'hotel',
    entityId: hotelId,
    hotelId,
    before: { amenityIds: before },
    after: { amenityIds },
    requestId,
  });

  return { hotelId, amenityIds };
}

module.exports = { setHotelAmenities };
