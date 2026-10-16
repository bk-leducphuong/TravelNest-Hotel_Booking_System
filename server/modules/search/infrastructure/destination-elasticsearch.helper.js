const elasticsearchClient = require('@config/elasticsearch.config');
const logger = require('@config/logger.config');
const { compactKey } = require('@utils/placeName');

/**
 * Destination (city/country) Elasticsearch access.
 *
 * Besides the text fields, documents carry a `display_name_compact` keyword
 * (see the destinations index seeder) holding the diacritic/space-insensitive
 * form, e.g. "Ha Noi" -> "hanoi". Queries always use `compactKey` for that field
 * so "Hanoi", "Ha Noi" and "Hà Nội" all match.
 */
class DestinationElasticsearchHelper {
  constructor() {
    this.indexName = 'destinations';
  }

  async searchByText(query, size = 5) {
    try {
      const compact = compactKey(query);

      const should = [
        {
          multi_match: {
            query,
            fields: ['display_name^3', 'normalized_name^2', 'slug'],
            fuzziness: 'AUTO',
            operator: 'and',
          },
        },
      ];

      if (compact) {
        should.push({ term: { display_name_compact: compact } });
        should.push({
          match: { display_name_compact: { query: compact, fuzziness: 'AUTO' } },
        });
      }

      const response = await elasticsearchClient.search({
        index: this.indexName,
        body: {
          query: {
            bool: {
              should,
              minimum_should_match: 1,
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

  /**
   * Prefix suggestions. The completion suggester is the fast path; when it
   * returns nothing (e.g. "Hanoi" is not a token prefix of "Ha Noi") we fall
   * back to a compact-field prefix/fuzzy query.
   */
  async getSuggestions(prefix, size = 10) {
    try {
      const completion = await this._completionSuggest(prefix, size);
      if (completion.length > 0) return completion;

      return await this._compactSuggest(prefix, size);
    } catch (error) {
      logger.error('Destination ES suggestions error:', error);
      return [];
    }
  }

  async _completionSuggest(prefix, size) {
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

    const options = response.suggest?.['destination-suggest']?.[0]?.options || [];

    return options.map((option) => ({
      text: option.text,
      score: option._score,
      payload: option._source || null,
    }));
  }

  async _compactSuggest(prefix, size) {
    const compact = compactKey(prefix);
    if (!compact) return [];

    const response = await elasticsearchClient.search({
      index: this.indexName,
      body: {
        query: {
          bool: {
            should: [
              { prefix: { display_name_compact: compact } },
              {
                match: { display_name_compact: { query: compact, fuzziness: 'AUTO' } },
              },
            ],
            minimum_should_match: 1,
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
      text: hit._source.display_name,
      score: hit._score,
      payload: hit._source,
    }));
  }
}

module.exports = new DestinationElasticsearchHelper();
