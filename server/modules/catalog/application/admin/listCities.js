const hotelRepository = require('../../infrastructure/hotel.repository');

/**
 * Paginated city reference data for the admin property editor.
 * Cities are global (not hotel-scoped) and read-only.
 */
async function listCities(filters = {}) {
  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 100, 1), 200);

  const result = await hotelRepository.findCitiesForAdmin({
    search: filters.search,
    countryId: filters.countryId,
    limit,
    offset: (page - 1) * limit,
  });

  return { cities: result.rows, page, limit, total: result.count };
}

module.exports = { listCities };
