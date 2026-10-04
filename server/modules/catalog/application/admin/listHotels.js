const hotelRepository = require('../../infrastructure/hotel.repository');

/**
 * Paginated hotel list for the back-office.
 */
async function listHotels(filters = {}) {
  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 20, 1), 100);

  const result = await hotelRepository.findAllForAdmin({
    search: filters.search,
    status: filters.status,
    cityId: filters.cityId,
    limit,
    offset: (page - 1) * limit,
  });

  return {
    hotels: result.rows,
    page,
    limit,
    total: result.count,
  };
}

module.exports = { listHotels };
