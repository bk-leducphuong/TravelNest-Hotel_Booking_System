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

module.exports = { upsertHotel };
