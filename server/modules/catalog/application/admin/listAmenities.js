const hotelRepository = require('../../infrastructure/hotel.repository');

/**
 * Paginated amenity catalog for the back-office (used by the hotel/room
 * amenity pickers).
 */
async function listAmenities(filters = {}) {
  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 100, 1), 200);

  const result = await hotelRepository.findAmenitiesForAdmin({
    search: filters.search,
    category: filters.category,
    applicableTo: filters.applicableTo,
    limit,
    offset: (page - 1) * limit,
  });

  return { amenities: result.rows, page, limit, total: result.count };
}

module.exports = { listAmenities };
