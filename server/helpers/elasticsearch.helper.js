const elasticsearchClient = require('../config/elasticsearch.config');
const logger = require('../config/logger.config');

class ElasticsearchHelper {
  constructor() {
    this.indexName = 'hotels';
  }

  /**
   * Build Elasticsearch query from search parameters
   * @param {Object} params - Search parameters
   * @returns {Object} Elasticsearch query object
   */
  buildSearchQuery(params) {
    const {
      // Location
      city,
      country,
      latitude,
      longitude,
      radius = 10, // km

      // Filters
      minPrice,
      maxPrice,
      minRating,
      hotelClass,
      amenities,
      freeCancellation,

      // Sorting
      sortBy = 'relevance',

      // Pagination
      size = 200, // Limit ES results for DB phase
    } = params;

    const query = {
      bool: {
        filter: [
          // Always filter by active status
          { term: { 'status.keyword': 'active' } },
          { term: { is_available: true } },
          { term: { has_available_rooms: true } },
        ],
        must: [],
        should: [],
      },
    };

    // Location filters
    if (city) {
      query.bool.must.push({
        match: {
          city: {
            query: city,
            fuzziness: 'AUTO',
          },
        },
      });
    }

    if (country) {
      query.bool.filter.push({
        term: { 'country.keyword': country },
      });
    }

    // Geo-distance filter
    if (latitude && longitude) {
      query.bool.filter.push({
        geo_distance: {
          distance: `${radius}km`,
          location: {
            lat: parseFloat(latitude),
            lon: parseFloat(longitude),
          },
        },
      });
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceRange = {};
      if (minPrice !== undefined) priceRange.gte = parseFloat(minPrice);
      if (maxPrice !== undefined) priceRange.lte = parseFloat(maxPrice);

      query.bool.filter.push({
        range: { min_price: priceRange },
      });
    }

    // Rating filter
    if (minRating !== undefined) {
      query.bool.filter.push({
        range: { avg_rating: { gte: parseFloat(minRating) } },
      });
    }

    // Hotel class filter
    if (hotelClass && Array.isArray(hotelClass) && hotelClass.length > 0) {
      query.bool.filter.push({
        terms: { hotel_class: hotelClass.map((c) => parseInt(c, 10)) },
      });
    }

    // Amenities filter
    if (amenities && Array.isArray(amenities) && amenities.length > 0) {
      query.bool.filter.push({
        terms: { amenity_codes: amenities },
      });
    }

    // Free cancellation filter
    if (freeCancellation === true || freeCancellation === 'true') {
      query.bool.filter.push({
        term: { has_free_cancellation: true },
      });
    }

    // Build sort
    const sort = this._buildSort(sortBy, latitude, longitude);

    return {
      query,
      sort,
      size,
      _source: [
        'hotel_id',
        'hotel_name',
        'city',
        'country',
        'location',
        'latitude',
        'longitude',
        'min_price',
        'max_price',
        'avg_rating',
        'review_count',
        'hotel_class',
        'status',
        'amenity_codes',
        'has_free_cancellation',
        'primary_image_url',
        'total_bookings',
        'view_count',
      ],
    };
  }

  /**
   * Build sort configuration
   * @private
   */
  _buildSort(sortBy, latitude, longitude) {
    switch (sortBy) {
      case 'price_asc':
        return [{ min_price: { order: 'asc' } }];

      case 'price_desc':
        return [{ min_price: { order: 'desc' } }];

      case 'rating':
        return [
          { avg_rating: { order: 'desc' } },
          { review_count: { order: 'desc' } },
        ];

      case 'distance':
        if (latitude && longitude) {
          return [
            {
              _geo_distance: {
                location: {
                  lat: parseFloat(latitude),
                  lon: parseFloat(longitude),
                },
                order: 'asc',
                unit: 'km',
              },
            },
          ];
        }
        return [{ _score: { order: 'desc' } }];

      case 'popularity':
        return [{ total_bookings: { order: 'desc' } }];

      case 'relevance':
      default:
        // Smart ranking: combine score with rating
        return [
          { _score: { order: 'desc' } },
          { avg_rating: { order: 'desc' } },
        ];
    }
  }

  /**
   * Execute search query
   * @param {Object} query - Elasticsearch query
   * @returns {Promise<Array>} Search results
   */
  async search(query) {
    try {
      const response = await elasticsearchClient.search({
        index: this.indexName,
        body: query,
      });

      const hits = response.hits.hits;

      return hits.map((hit) => {
        const source = hit._source;
        const result = {
          ...source,
          _score: hit._score,
        };

        // Add distance if geo sort was used
        if (
          hit.sort &&
          hit.sort.length > 0 &&
          typeof hit.sort[0] === 'number'
        ) {
          result.distance_km = parseFloat(hit.sort[0].toFixed(2));
        }

        return result;
      });
    } catch (error) {
      logger.error('Elasticsearch search error:', error);
      throw error;
    }
  }

  /**
   * Check if Elasticsearch is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      await elasticsearchClient.ping();
      return true;
    } catch (error) {
      logger.error('Elasticsearch is not available:', error);
      return false;
    }
  }

  /**
   * Get suggestions for autocomplete
   * @param {string} prefix - Search prefix
   * @param {number} size - Number of suggestions
   * @returns {Promise<Array>}
   */
  async getSuggestions(prefix, size = 10) {
    try {
      const response = await elasticsearchClient.search({
        index: this.indexName,
        body: {
          suggest: {
            'hotel-suggest': {
              prefix,
              completion: {
                field: 'hotel_name.suggest',
                size,
                skip_duplicates: true,
              },
            },
          },
        },
      });

      const suggestions = response.suggest['hotel-suggest'][0].options;
      return suggestions.map((s) => ({
        text: s.text,
        score: s._score,
      }));
    } catch (error) {
      logger.error('Elasticsearch suggestions error:', error);
      return [];
    }
  }
}

module.exports = new ElasticsearchHelper();
