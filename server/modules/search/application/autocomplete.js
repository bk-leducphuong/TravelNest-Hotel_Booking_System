const logger = require('@config/logger.config');
const catalog = require('@modules/catalog');

const searchRepository = require('../infrastructure/search.repository');

/**
 * Autocomplete (MySQL-only).
 *
 * Hotel names come from the pre-normalized snapshot columns; destinations come
 * from the catalog's cached active list. No Elasticsearch client is initialized
 * or called.
 */

/**
 * Autocomplete suggestions for hotel names. Degrades to an empty list on error
 * so a suggestion failure never breaks the search bar.
 */
async function getAutocompleteSuggestions(query, limit = 10) {
  try {
    const suggestions = await searchRepository.findHotelNameSuggestions(query, limit);

    return {
      success: true,
      data: {
        suggestions,
      },
    };
  } catch (error) {
    logger.error({ error }, 'Hotel autocomplete error:');
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
 * Matching is normalization-aware and typo-tolerant inside the catalog module,
 * so typing "Hanoi" suggests "Ha Noi" and "Saigon" suggests "Ho Chi Minh City".
 * The payload shape is unchanged for SearchBar.
 */
async function getDestinationAutocomplete(query, limit = 10) {
  const trimmed = typeof query === 'string' ? query.trim() : '';
  if (!trimmed) {
    return { success: true, data: { suggestions: [] } };
  }

  let suggestions = [];

  try {
    suggestions = await catalog.suggestDestinations(trimmed, limit);
  } catch (error) {
    logger.error({ error }, 'Destination autocomplete error:');
    suggestions = [];
  }

  return {
    success: true,
    data: {
      suggestions,
    },
  };
}

module.exports = { getAutocompleteSuggestions, getDestinationAutocomplete };
