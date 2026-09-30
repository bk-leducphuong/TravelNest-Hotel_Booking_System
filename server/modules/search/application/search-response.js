const { buildFilterOptions } = require('../domain/facets');

/**
 * Build the paginated search response envelope.
 */
function formatSearchResponse(hotels, params, totalCandidates, startTime) {
  const { page, limit } = params;

  const total = hotels.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const paginatedHotels = hotels.slice(offset, offset + limit);

  return {
    success: true,
    data: {
      hotels: paginatedHotels,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters_applied: {
        destinationId: params.destinationId,
        destinationType: params.destinationType,
        cityId: params.cityId,
        countryId: params.countryId,
        city: params.city,
        country: params.country,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        nights: params.nights,
        adults: params.adults,
        children: params.children,
        rooms: params.rooms,
        totalGuests: params.totalGuests,
        priceRange: {
          min: params.minPrice,
          max: params.maxPrice,
        },
        minRating: params.minRating,
        hotelClass: params.hotelClass,
        amenities: params.amenities,
        freeCancellation: params.freeCancellation,
        sortBy: params.sortBy,
      },
      filter_options: buildFilterOptions(hotels),
      search_metadata: {
        es_candidates: totalCandidates,
        available_hotels: total,
        search_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    },
  };
}

/**
 * Build the response envelope for a search with no candidates/availability.
 */
function formatEmptyResponse(params, startTime) {
  return {
    success: true,
    data: {
      hotels: [],
      pagination: {
        page: params.page,
        limit: params.limit,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
      filters_applied: {
        destinationId: params.destinationId,
        destinationType: params.destinationType,
        cityId: params.cityId,
        countryId: params.countryId,
        city: params.city,
        country: params.country,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        nights: params.nights,
      },
      search_metadata: {
        es_candidates: 0,
        available_hotels: 0,
        search_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      filter_options: buildFilterOptions([]),
      suggestions: {
        message: 'No hotels found matching your criteria',
        alternatives: [
          'Try expanding your search radius',
          'Adjust your price range',
          'Try different dates',
          'Remove some filters',
        ],
      },
    },
  };
}

module.exports = { formatSearchResponse, formatEmptyResponse };
