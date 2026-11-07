const identity = require('@modules/identity');

const hotelRepository = require('../../infrastructure/hotel.repository');
const hotelSearchSnapshotRepository = require('../../infrastructure/hotel_search_snapshot.repository');

/**
 * Build the lightweight "hotel card" shape used by trending / recently-viewed /
 * batch endpoints. One primary image URL keeps the payload small.
 */

function parseNullableNumber(value) {
  return value !== null && value !== undefined ? parseFloat(value) : null;
}

async function enrichHotelCardsByIds(hotelIds = [], userId = null) {
  if (!Array.isArray(hotelIds) || hotelIds.length === 0) return [];

  const [rows, facetRows] = await Promise.all([
    hotelRepository.findBasicByIds(hotelIds),
    hotelSearchSnapshotRepository.findCardFacetsByIds(hotelIds),
  ]);
  const facetsById = new Map(facetRows.map((facet) => [String(facet.hotelId), facet]));
  const byId = new Map(rows.map((hotel) => [String(hotel.id), hotel]));

  const ordered = hotelIds
    .map((id) => byId.get(String(id)))
    .filter(Boolean)
    .map((hotel) => (hotel.toJSON ? hotel.toJSON() : hotel));

  const favoriteIds =
    userId && ordered.length
      ? await identity.getFavoriteHotelIds(
          userId,
          ordered.map((hotel) => hotel.id)
        )
      : [];
  const favorites = new Set(favoriteIds.map(String));

  return ordered.map((hotel) => {
    const images = Array.isArray(hotel.images) ? hotel.images : [];
    const primary =
      images.find((image) => image.is_primary) ||
      [...images].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))[0] ||
      null;
    const facet = facetsById.get(String(hotel.id));
    const overallRating = facet?.overallRating ?? 0;
    const totalReviews = Number(facet?.totalReviews) || 0;

    return {
      id: hotel.id,
      is_favorite: favorites.has(String(hotel.id)),
      name: hotel.name,
      address: hotel.address,
      city: hotel.city ? { id: hotel.city.id, name: hotel.city.name, slug: hotel.city.slug } : null,
      country: hotel.country
        ? { id: hotel.country.id, name: hotel.country.name, isoCode: hotel.country.iso_code }
        : null,
      latitude: parseNullableNumber(hotel.latitude),
      longitude: parseNullableNumber(hotel.longitude),
      hotelClass: hotel.hotel_class ?? null,
      minPrice: facet?.minPrice ?? parseNullableNumber(hotel.min_price),
      currency: 'USD',
      ratingSummary: overallRating > 0 ? { overallRating, totalReviews } : null,
      primaryImageUrl: primary?.object_key ?? null,
    };
  });
}

module.exports = { enrichHotelCardsByIds };
