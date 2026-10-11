const { Hotels } = require('@platform/database');

/**
 * Hotel write operations.
 *
 * `upsertHotel` supports partner onboarding, which creates or updates the
 * owner's hotel record.
 */
async function upsertHotel(hotelData) {
  return await Hotels.upsert(
    {
      owner_id: hotelData.ownerId,
      name: hotelData.name,
      address: hotelData.address,
      city: hotelData.city,
      latitude: hotelData.latitude,
      longitude: hotelData.longitude,
      overall_rating: hotelData.rating,
      check_in_time: hotelData.checkInTime,
      check_out_time: hotelData.checkOutTime,
      hotel_amenities: hotelData.amenities,
      created_at: new Date(),
      updated_at: new Date(),
    },
    { returning: true }
  );
}

/**
 * Update hotel columns (snake_case, already mapped by the caller). Returns the
 * affected row count; callers re-read through the repository if they need the
 * fresh record.
 */
async function updateHotel(hotelId, values) {
  return await Hotels.update(
    {
      ...values,
      updated_at: new Date(),
    },
    { where: { id: hotelId } }
  );
}

module.exports = { upsertHotel, updateHotel };
