const logger = require('@config/logger.config');

const { applyDateSpecificFilters } = require('../domain/filters');
const { rankAndSort } = require('../domain/ranking');
const {
  findCandidates,
  checkAvailability,
  getRoomDetails,
  mergeData,
} = require('./search-pipeline');
const { formatSearchResponse, formatEmptyResponse } = require('./search-response');
const { attachFavoriteStatus } = require('./attachFavoriteStatus');
const { resolveDestination } = require('./resolveDestination');

/**
 * Hybrid hotel search: resolve destination, find candidates (ES), verify
 * date-range availability, fetch room pricing, merge, filter, rank, paginate.
 *
 * @param {object} params - validated search params
 * @param {number|null} userId
 * @returns {Promise<{ destination: object, searchResults: object }>}
 */
async function searchHotels(params, userId = null) {
  const startTime = Date.now();

  try {
    const destination = await resolveDestination(params);

    const paramsWithDestination = {
      ...params,
      destinationId: destination?.id || null,
      destinationType: destination?.type || null,
      cityId: destination?.city_id || params.cityId || null,
      countryId: destination?.country_id || params.countryId || null,
      city: destination?.type === 'city' ? destination.display_name : params.city || null,
      country: destination?.country_name || params.country || null,
    };

    // Calculate derived fields
    const checkIn = new Date(paramsWithDestination.checkIn);
    const checkOut = new Date(paramsWithDestination.checkOut);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const totalGuests = paramsWithDestination.adults + (paramsWithDestination.children || 0);

    const validated = {
      ...paramsWithDestination,
      nights,
      totalGuests,
    };

    // Phase 1: Elasticsearch - Find candidate hotels
    const candidateHotels = await findCandidates(validated);

    if (candidateHotels.length === 0) {
      return {
        destination: { id: destination?.id || null, type: destination?.type || null },
        searchResults: formatEmptyResponse(validated, startTime),
      };
    }

    const hotelIds = candidateHotels.map((hotel) => hotel.hotel_id);

    // Phase 2: Database - Check date-specific availability
    const availableHotels = await checkAvailability(hotelIds, validated);

    if (availableHotels.length === 0) {
      return {
        destination: { id: destination?.id || null, type: destination?.type || null },
        searchResults: formatEmptyResponse(validated, startTime),
      };
    }

    // Phase 3: Database - Get room details and pricing
    const hotelsWithRooms = await getRoomDetails(availableHotels, validated);

    // Phase 4: Merge ES data with DB data
    const enrichedHotels = mergeData(candidateHotels, hotelsWithRooms);

    // Apply filters that depend on date-specific room pricing.
    const filteredHotels = applyDateSpecificFilters(enrichedHotels, validated);

    // Phase 5: Re-rank and sort
    const rankedHotels = rankAndSort(filteredHotels, validated.sortBy);

    // Phase 6: Format and paginate response
    const response = formatSearchResponse(
      rankedHotels,
      validated,
      candidateHotels.length,
      startTime
    );

    await attachFavoriteStatus(response, userId);

    logger.info(
      {
        candidates: candidateHotels.length,
        available: rankedHotels.length,
        duration: Date.now() - startTime,
      },
      'Hotel search completed'
    );

    return {
      destination: {
        id: destination?.id || null,
        type: destination?.type || null,
      },
      searchResults: response,
    };
  } catch (error) {
    logger.error(error, 'Hotel search error:');
    throw error;
  }
}

module.exports = { searchHotels };
