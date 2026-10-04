const ApiError = require('@utils/ApiError');
const { auditService } = require('@platform/audit');

const hotelRepository = require('../../infrastructure/hotel.repository');

/** Input field -> hotels column. Only these are editable through the back-office. */
const EDITABLE_FIELDS = {
  name: 'name',
  description: 'description',
  address: 'address',
  cityId: 'city_id',
  countryId: 'country_id',
  phoneNumber: 'phone_number',
  latitude: 'latitude',
  longitude: 'longitude',
  hotelClass: 'hotel_class',
  checkInTime: 'check_in_time',
  checkOutTime: 'check_out_time',
  checkInPolicy: 'check_in_policy',
  checkOutPolicy: 'check_out_policy',
  minPrice: 'min_price',
  status: 'status',
  timezone: 'timezone',
};

/**
 * Update a hotel's editable fields. Audited.
 */
async function updateHotel(hotelId, payload = {}, { actorUserId, requestId } = {}) {
  const existing = await hotelRepository.findByIdForAdmin(hotelId);

  if (!existing) {
    throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
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
      'NO_HOTEL_CHANGES',
      `No editable fields provided (${Object.keys(EDITABLE_FIELDS).join(', ')})`
    );
  }

  await hotelRepository.updateHotel(hotelId, values);

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'hotel.updated',
    entityType: 'hotel',
    entityId: hotelId,
    hotelId,
    before: existing.toJSON ? existing.toJSON() : existing,
    after: values,
    requestId,
  });

  const hotel = await hotelRepository.findByIdForAdmin(hotelId);
  return { hotel };
}

module.exports = { updateHotel, EDITABLE_FIELDS };
