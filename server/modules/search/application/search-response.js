const { buildFilterOptions } = require('../domain/facets');

/**
 * Build the paginated search response envelope.
 *
 * Facets and totals use all eligible hotels supplied by the application before
 * slicing a page. Text-only searches may already have been capped by the
 * repository, so these totals are not necessarily every database name match.
 */

/** Echo the application search context; this does not recompute filters. */
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

/** Page numbers are 1-based. An empty result has totalPages=0. */
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

/**
 * Accept already-ranked eligible hotels. Slice only the card list; calculate
 * counts and filter options from the unsliced list to keep page changes from
 * changing sidebar counts. No further SQL runs here. search_time_ms measures
 * work up to this formatting call, before favorites and controller side effects.
 */
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
 * Use the same response shape when there are no candidates or no qualifying
 * offers. This is a successful search with an empty list, not an HTTP error.
 * The empty envelope reports candidates=0 even when candidates existed but
 * none survived offer filtering; it does not preserve the earlier count.
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
