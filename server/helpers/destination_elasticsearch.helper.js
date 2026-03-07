const elasticsearchClient = require('../config/elasticsearch.config');
const logger = require('../config/logger.config');

class DestinationElasticsearchHelper {
  constructor() {
    this.indexName = 'destinations';
  }

  async searchByText(query, size = 5) {
    try {
      const response = await elasticsearchClient.search({
        index: this.indexName,
        body: {
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query,
                    fields: ['display_name^3', 'normalized_name^2', 'slug'],
                    fuzziness: 'AUTO',
                    operator: 'and',
                  },
                },
              ],
              filter: [
                {
                  term: { is_active: true },
                },
              ],
            },
          },
          size,
        },
      });

      return response.hits.hits.map((hit) => ({
        ...hit._source,
        _score: hit._score,
      }));
    } catch (error) {
      logger.error(error, 'Destination ES search error:');
      return [];
    }
  }

  async getSuggestions(prefix, size = 10) {
    try {
      const response = await elasticsearchClient.search({
        index: this.indexName,
        body: {
          suggest: {
            'destination-suggest': {
              prefix,
              completion: {
                field: 'display_name.suggest',
                size,
                skip_duplicates: true,
              },
            },
          },
        },
      });

      const suggestions = response.suggest['destination-suggest'][0].options;

      return suggestions.map((s) => ({
        text: s.text,
        score: s._score,
        payload: s._source || null,
      }));
    } catch (error) {
      logger.error('Destination ES suggestions error:', error);
      return [];
    }
  }
}

module.exports = new DestinationElasticsearchHelper();

