const logger = require('@config/logger.config');
const catalog = require('@modules/catalog');
const { applyAlias } = require('@utils/placeName');
const elasticsearchHelper = require('../infrastructure/elasticsearch.helper');
const destinationElasticsearchHelper = require('../infrastructure/destination-elasticsearch.helper');

/**
 * Autocomplete suggestions for hotel names. Degrades to an empty list on error.
 */
async function getAutocompleteSuggestions(query, limit = 10) {
  try {
    const suggestions = await elasticsearchHelper.getSuggestions(query, limit);

    return {
      success: true,
      data: {
        suggestions,
      },
    };
  } catch (error) {
    logger.error('Autocomplete error:', error);
    return {
      success: true,
      data: {
        suggestions: [],
      },
    };
  }
}

/**
 * Autocomplete suggestions for destinations (cities/countries).
 *
 * Elasticsearch is the fast path. When it is unavailable or returns nothing we
 * fall back to a normalization-aware DB lookup so guests still get suggestions
 * (e.g. typing "Hanoi" suggests "Ha Noi").
 */
async function getDestinationAutocomplete(query, limit = 10) {
  const trimmed = typeof query === 'string' ? query.trim() : '';
  if (!trimmed) {
    return { success: true, data: { suggestions: [] } };
  }

  // Rewrite known aliases ("Saigon" -> "Ho Chi Minh City") so the dropdown and
  // the search agree on the same destination.
  const effectiveQuery = applyAlias(trimmed);

  let suggestions = [];

  try {
    suggestions = await destinationElasticsearchHelper.getSuggestions(effectiveQuery, limit);
  } catch (error) {
    logger.error({ error }, 'Destination autocomplete error:');
  }

  if (suggestions.length === 0) {
    try {
      suggestions = await catalog.suggestDestinations(effectiveQuery, limit);
    } catch (error) {
      logger.error({ error }, 'Destination autocomplete DB fallback error:');
      suggestions = [];
    }
  }

  return {
    success: true,
    data: {
      suggestions,
    },
  };
}

module.exports = { getAutocompleteSuggestions, getDestinationAutocomplete };
