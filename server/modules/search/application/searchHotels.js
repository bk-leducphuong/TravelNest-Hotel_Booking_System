const logger = require('@config/logger.config');

const { rankAndSort } = require('../domain/ranking');
const { findCandidates, getOffers, buildHotelResults } = require('./search-pipeline');
const { formatSearchResponse, formatEmptyResponse } = require('./search-response');
const { attachFavoriteStatus } = require('./attachFavoriteStatus');
const { resolveDestination } = require('./resolveDestination');

/**
 * Callers (e.g. the recent-search recorder) need the display fields that
 * resolveDestination returns, not just the id/type. Returning them here keeps
 * cityId/city/country from silently becoming null downstream.
 */
function toDestinationSummary(destination) {
  return {
    id: destination?.id || null,
    type: destination?.type || null,
    city_id: destination?.city_id || null,
    country_id: destination?.country_id || null,
    display_name: destination?.display_name || null,
    country_name: destination?.country_name || null,
  };
}

/**
 * MySQL hotel search: resolve destination, filter candidates from the snapshot
 * read model, compute batched availability + eligible offers, rank, facet and
 * paginate. Elasticsearch is not part of this path.
 *
 * @param {object} params - validated search params
 * @param {number|null} userId
 * @returns {Promise<{ destination: object, searchResults: object }>}
 */
async function searchHotels(params, userId = null) {
  const startTime = Date.now();

  try {
    const destination = await resolveDestination(params);

    // When a destination resolved, the free text is that destination's name —
    // never also constrain on a hotel-name match. Unresolved text is treated as
    // hotel-name intent.
    const nameText = destination
      ? null
      : (params.city || params.country || params.location || '').trim() || null;

    const validated = {
      ...params,
      destinationId: destination?.id || null,
      destinationType: destination?.type || null,
      cityId: destination?.city_id || params.cityId || null,
      countryId: destination?.country_id || params.countryId || null,
      city: destination?.type === 'city' ? destination.display_name : params.city || null,
      country: destination?.country_name || params.country || null,
      nameText,
      totalGuests: (Number(params.adults) || 0) + (Number(params.children) || 0),
    };

    const candidateHotels = await findCandidates(validated);

    if (candidateHotels.length === 0) {
      return {
        destination: toDestinationSummary(destination),
        searchResults: formatEmptyResponse(validated, startTime),
      };
    }

    const offersByHotel = await getOffers(candidateHotels, validated);
    const eligibleHotels = buildHotelResults(candidateHotels, offersByHotel, validated);

    if (eligibleHotels.length === 0) {
      return {
        destination: toDestinationSummary(destination),
        searchResults: formatEmptyResponse(validated, startTime),
      };
    }

    const hasAnchor =
      Number.isFinite(Number(validated.latitude)) && Number.isFinite(Number(validated.longitude));

    // Rank the complete eligible set; pagination happens last.
    const rankedHotels = rankAndSort(eligibleHotels, validated.sortBy, {
      hasAnchor,
      nameIntent: Boolean(nameText),
      distanceScaleKm: Number(validated.radius) || undefined,
    });

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
        eligible: eligibleHotels.length,
        duration: Date.now() - startTime,
      },
      'Hotel search completed'
    );

    return {
      destination: toDestinationSummary(destination),
      searchResults: response,
    };
  } catch (error) {
    logger.error(error, 'Hotel search error:');
    throw error;
  }
}

module.exports = { searchHotels };
