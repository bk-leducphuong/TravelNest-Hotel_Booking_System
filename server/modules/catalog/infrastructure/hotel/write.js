const { Hotels } = require('@platform/database');

/**
 * Hotel write operations.
 *
 * Onboarding creates or updates the owner's hotel record. Only real `hotels`
 * columns are written:
 *
 * - `rating` maps to the `hotel_class` column (1-5 stars); the old
 *   `overall_rating`/`hotel_amenities`/`owner_id` names never existed as hotel
 *   columns and were silently dropped.
 * - `city` is resolved to `city_id` by the caller (catalog owns cities), not
 *   written as a free-text column.
 */

/** Map an onboarding camelCase payload to `hotels` columns. */
function toHotelColumns(hotelData) {
  const values = {
    name: hotelData.name,
    address: hotelData.address,
    latitude: hotelData.latitude,
    longitude: hotelData.longitude,
    check_in_time: hotelData.checkInTime,
    check_out_time: hotelData.checkOutTime,
    updated_at: new Date(),
  };

  if (hotelData.cityId !== undefined) {
    values.city_id = hotelData.cityId;
  }

  if (hotelData.hotelClass !== undefined && hotelData.hotelClass !== null) {
    values.hotel_class = hotelData.hotelClass;
  }

  return values;
}

async function createHotel(hotelData, options = {}) {
  return await Hotels.create(
    {
      ...toHotelColumns(hotelData),
      created_at: new Date(),
    },
    options
  );
}

/**
 * Update hotel columns (snake_case, already mapped by the caller). Returns the
 * affected row count; callers re-read through the repository if they need the
 * fresh record. Used by the admin back-office.
 */
async function updateHotel(hotelId, values, options = {}) {
  return await Hotels.update(
    {
      ...values,
      updated_at: new Date(),
    },
    { where: { id: hotelId }, ...options }
  );
}

/**
 * Update a hotel from an onboarding payload (camelCase in) and return the
 * refreshed instance (or null when the hotel does not exist). Uses
 * instance.update so MySQL returns the row without a `RETURNING`-style read.
 */
async function updateHotelFromPayload(hotelId, hotelData, options = {}) {
  const hotel = await Hotels.findByPk(hotelId, options);
  if (!hotel) {
    return null;
  }

  await hotel.update(toHotelColumns(hotelData), options);
  return hotel;
}

module.exports = { createHotel, updateHotel, updateHotelFromPayload };
