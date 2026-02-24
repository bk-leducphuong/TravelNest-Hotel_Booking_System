const Joi = require('joi');

const { pagination } = require('./common.schema');

/**
 * Home validation schemas
 * Following RESTful API standards
 */

// Common validations
const hotelIdSchema = Joi.number().integer().positive().messages({
  'number.base': 'hotelId must be a number',
  'number.integer': 'hotelId must be an integer',
  'number.positive': 'hotelId must be a positive number',
});

const searchIdSchema = Joi.number().integer().positive().required().messages({
  'number.base': 'searchId must be a number',
  'number.integer': 'searchId must be an integer',
  'number.positive': 'searchId must be a positive number',
  'any.required': 'searchId is required',
});

const coordinateSchema = Joi.number().min(-90).max(90).messages({
  'number.base': 'Must be a number',
  'number.min': 'Latitude must be between -90 and 90',
  'number.max': 'Latitude must be between -90 and 90',
});

const longitudeSchema = Joi.number().min(-180).max(180).messages({
  'number.base': 'Must be a number',
  'number.min': 'Longitude must be between -180 and 180',
  'number.max': 'Longitude must be between -180 and 180',
});
/**
 * GET /api/home/recent-viewed-hotels
 * Get recent viewed hotels
 */

exports.getRecentViewedHotels = {
  query: Joi.object({
    hotelIds: Joi.alternatives()
      .try(
        // Case 1: hotelIds is a JSON string
        Joi.string().custom((value, helpers) => {
          let parsed;

          try {
            parsed = JSON.parse(value);
          } catch {
            return helpers.error('any.invalid');
          }

          if (!Array.isArray(parsed)) {
            return helpers.error('array.base');
          }

          const { error } = Joi.array().items(hotelIdSchema).min(1).validate(parsed);

          if (error) {
            return helpers.error('any.invalid');
          }

          return parsed; // normalized value
        }),

        // Case 2: hotelIds is already an array
        Joi.array().items(hotelIdSchema).min(1)
      )
      .optional(),
  }),
};

/**
 * POST /api/home/recent-viewed-hotels
 * Record a hotel view
 */
exports.recordHotelView = {
  body: Joi.object({
    hotelId: hotelIdSchema.required().messages({
      'any.required': 'hotelId is required',
    }),
  }).required(),
};

/**
 * GET /api/home/recent-searches
 * Get recent searches
 */
exports.getRecentSearches = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
  }),
};

/**
 * DELETE /api/home/recent-searches/:searchId
 * Remove a recent search
 */
exports.removeRecentSearch = {
  params: Joi.object({
    searchId: searchIdSchema,
  }).required(),
};

/**
 * GET /api/home/popular-places
 * Get popular places
 */
exports.getPopularPlaces = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(5),
  }),
};

/**
 * GET /api/home/nearby-hotels
 * Get nearby hotels
 */
exports.getNearbyHotels = {
  query: Joi.object({
    latitude: coordinateSchema.required().messages({
      'any.required': 'latitude is required',
    }),
    longitude: longitudeSchema.required().messages({
      'any.required': 'longitude is required',
    }),
    radius: Joi.number().positive().max(100).default(6).messages({
      'number.base': 'radius must be a number',
      'number.positive': 'radius must be positive',
      'number.max': 'radius must not exceed 100 km',
    }),
  }).required(),
};

/**
 * GET /api/home/top-rated-hotels
 * Get top rated hotels
 */
exports.getTopRatedHotels = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
    minRating: Joi.number().min(0).max(5).default(4).messages({
      'number.base': 'minRating must be a number',
      'number.min': 'minRating must be between 0 and 5',
      'number.max': 'minRating must be between 0 and 5',
    }),
    minReviews: Joi.number().integer().min(1).default(5).messages({
      'number.base': 'minReviews must be a number',
      'number.integer': 'minReviews must be an integer',
      'number.min': 'minReviews must be at least 1',
    }),
  }),
};

/**
 * GET /api/home/recently-viewed-hotels
 * Get recently viewed hotels with full details
 */
exports.getRecentlyViewedHotels = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
  }),
};

/**
 * GET /api/home/popular-destinations
 * Get popular destinations
 */
exports.getPopularDestinations = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
    minHotels: Joi.number().integer().min(1).default(5).messages({
      'number.base': 'minHotels must be a number',
      'number.integer': 'minHotels must be an integer',
      'number.min': 'minHotels must be at least 1',
    }),
  }),
};

/**
 * GET /api/home/trending-hotels
 * Get trending hotels
 */
exports.getTrendingHotels = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
    days: Joi.number().integer().min(1).max(365).default(30).messages({
      'number.base': 'days must be a number',
      'number.integer': 'days must be an integer',
      'number.min': 'days must be at least 1',
      'number.max': 'days must not exceed 365',
    }),
  }),
};
