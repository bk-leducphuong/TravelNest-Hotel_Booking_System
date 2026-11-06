const hotelRepository = require('../../infrastructure/hotel.repository');

/**
 * Paginated country reference data for the admin property editor.
 * Countries are global (not hotel-scoped) and read-only.
 */
async function listCountries(filters = {}) {
  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 200, 1), 300);

  const result = await hotelRepository.findCountriesForAdmin({
    search: filters.search,
    limit,
    offset: (page - 1) * limit,
  });

  return { countries: result.rows, page, limit, total: result.count };
}

module.exports = { listCountries };
