const logger = require('@config/logger.config');
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
 * Autocomplete suggestions for destinations (cities/countries). Degrades to an
 * empty list on error.
 */
async function getDestinationAutocomplete(query, limit = 10) {
  try {
    const suggestions = await destinationElasticsearchHelper.getSuggestions(query, limit);

    return {
      success: true,
      data: {
        suggestions,
      },
    };
  } catch (error) {
    logger.error({ error }, 'Destination autocomplete error:');
    return {
      success: true,
      data: {
        suggestions: [],
      },
    };
  }
}

module.exports = { getAutocompleteSuggestions, getDestinationAutocomplete };
