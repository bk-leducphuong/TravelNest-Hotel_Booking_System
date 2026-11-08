const { buildFilterOptions } = require('../domain/facets');

/**
 * Build the paginated search response envelope.
 *
 * Facets and totals are computed over the complete eligible set (before
 * pagination), never over a candidate cap or a single page.
 */

function buildFiltersApplied(params) {
  return {
    destinationId: params.destinationId,
    destinationType: params.destinationType,
    cityId: params.cityId,
    countryId: params.countryId,
    city: params.city,
    country: params.country,
    latitude: params.latitude ?? null,
    longitude: params.longitude ?? null,
    radius: params.radius ?? null,
    locationSource: params.locationSource ?? null,
    hotelName: params.nameText || null,
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
    payAtProperty: params.payAtProperty,
    sortBy: params.sortBy,
  };
}

function buildPagination(params, total) {
  const { page, limit } = params;
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

function formatSearchResponse(hotels, params, candidateCount, startTime) {
  const { page, limit } = params;
  const offset = (page - 1) * limit;
  const paginatedHotels = hotels.slice(offset, offset + limit);

  return {
    success: true,
    data: {
      hotels: paginatedHotels,
      pagination: buildPagination(params, hotels.length),
      filters_applied: buildFiltersApplied(params),
      filter_options: buildFilterOptions(hotels),
      search_metadata: {
        provider: 'mysql',
        candidates: candidateCount,
        available_hotels: hotels.length,
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
      pagination: buildPagination(params, 0),
      filters_applied: buildFiltersApplied(params),
      search_metadata: {
        provider: 'mysql',
        candidates: 0,
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

module.exports = { formatSearchResponse, formatEmptyResponse, buildFiltersApplied };
