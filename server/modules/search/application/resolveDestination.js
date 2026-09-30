const logger = require('@config/logger.config');
const destinationRepository = require('@repositories/destination.repository');
const destinationElasticsearchHelper = require('@helpers/destination_elasticsearch.helper');

/**
 * Resolve a unified destination (city or country) from raw search parameters.
 * Explicit id wins, then Elasticsearch text search, then a DB best-match.
 */
async function resolveDestination(params) {
  const explicitDestinationId = params.destinationId;
  if (explicitDestinationId) {
    const existing = await destinationRepository.findActiveById(explicitDestinationId);
    if (existing) return existing;
  }

  const text = (params.city || params.country || params.location || '').trim();
  if (!text) return null;

  try {
    const esResults = await destinationElasticsearchHelper.searchByText(text, 10);

    const cities = esResults.filter((destination) => destination.type === 'city');
    if (cities.length > 0) {
      return cities[0];
    }

    const countries = esResults.filter((destination) => destination.type === 'country');
    if (countries.length > 0) {
      return countries[0];
    }
  } catch (error) {
    logger.error(error, 'Destination ES resolution error, falling back to DB');
  }

  return destinationRepository.findBestMatchByName(text);
}

module.exports = { resolveDestination };
