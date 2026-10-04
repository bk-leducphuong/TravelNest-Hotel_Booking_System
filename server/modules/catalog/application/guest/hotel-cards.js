const hotelRepository = require('../../infrastructure/hotel.repository');

/**
 * Build the lightweight "hotel card" shape used by trending / recently-viewed /
 * batch endpoints. One primary image URL keeps the payload small.
 */

function parseNullableNumber(value) {
  return value !== null && value !== undefined ? parseFloat(value) : null;
}

async function enrichHotelCardsByIds(hotelIds = []) {
  if (!Array.isArray(hotelIds) || hotelIds.length === 0) return [];

  const rows = await hotelRepository.findBasicByIds(hotelIds);
  const byId = new Map(rows.map((hotel) => [String(hotel.id), hotel]));

  const ordered = hotelIds
    .map((id) => byId.get(String(id)))
    .filter(Boolean)
    .map((hotel) => (hotel.toJSON ? hotel.toJSON() : hotel));

  return ordered.map((hotel) => {
    const images = Array.isArray(hotel.images) ? hotel.images : [];
    const primary =
      images.find((image) => image.is_primary) ||
      [...images].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))[0] ||
      null;

    return {
      id: hotel.id,
      name: hotel.name,
      address: hotel.address,
      city: hotel.city ? { id: hotel.city.id, name: hotel.city.name, slug: hotel.city.slug } : null,
      country: hotel.country
        ? { id: hotel.country.id, name: hotel.country.name, isoCode: hotel.country.iso_code }
        : null,
      latitude: parseNullableNumber(hotel.latitude),
      longitude: parseNullableNumber(hotel.longitude),
      hotelClass: hotel.hotel_class ?? null,
      minPrice: parseNullableNumber(hotel.min_price),
      primaryImageUrl: primary?.object_key ?? null,
    };
  });
}

module.exports = { enrichHotelCardsByIds };
