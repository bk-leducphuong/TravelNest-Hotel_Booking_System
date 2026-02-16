const Joi = require('joi');
const { pagination } = require('./common.schema');

/**
 * Search validation schemas for V2 API
 * Following RESTful API standards
 */

/**
 * GET /api/v1/search/hotels
 * Search hotels with hybrid ES + DB architecture
 */
exports.searchHotels = {
  query: Joi.object({
    // Location (at least one required)
    city: Joi.string().trim().min(2).max(100),
    country: Joi.string().trim().min(2).max(100),
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180),
    radius: Joi.number().min(1).max(100).default(10), // km
    
    // Dates (REQUIRED)
    checkIn: Joi.date().iso().greater('now').required().messages({
      'date.base': 'checkIn must be a valid date',
      'date.greater': 'checkIn must be in the future',
      'any.required': 'checkIn is required',
    }),
    checkOut: Joi.date().iso().greater(Joi.ref('checkIn')).required().messages({
      'date.base': 'checkOut must be a valid date',
      'date.greater': 'checkOut must be after checkIn',
      'any.required': 'checkOut is required',
    }),
    
    // Legacy date field support
    checkInDate: Joi.date().iso().greater('now'),
    checkOutDate: Joi.date().iso().greater(Joi.ref('checkInDate')),
    
    // Guests (REQUIRED)
    adults: Joi.number().integer().min(1).max(20).required().messages({
      'number.base': 'adults must be a number',
      'number.min': 'adults must be at least 1',
      'number.max': 'adults cannot exceed 20',
      'any.required': 'adults is required',
    }),
    children: Joi.number().integer().min(0).max(20).default(0).messages({
      'number.base': 'children must be a number',
      'number.min': 'children cannot be negative',
      'number.max': 'children cannot exceed 20',
    }),
    rooms: Joi.number().integer().min(1).max(10).default(1).messages({
      'number.base': 'rooms must be a number',
      'number.min': 'rooms must be at least 1',
      'number.max': 'rooms cannot exceed 10',
    }),
    
    // Filters (optional)
    minPrice: Joi.number().min(0).messages({
      'number.base': 'minPrice must be a number',
      'number.min': 'minPrice cannot be negative',
    }),
    maxPrice: Joi.number().min(0).greater(Joi.ref('minPrice')).messages({
      'number.base': 'maxPrice must be a number',
      'number.greater': 'maxPrice must be greater than minPrice',
    }),
    minRating: Joi.number().min(0).max(5).messages({
      'number.base': 'minRating must be a number',
      'number.min': 'minRating must be at least 0',
      'number.max': 'minRating cannot exceed 5',
    }),
    hotelClass: Joi.alternatives().try(
      Joi.number().integer().min(1).max(5),
      Joi.array().items(Joi.number().integer().min(1).max(5)),
      Joi.string().pattern(/^[1-5](,[1-5])*$/) // Allow comma-separated string
    ).messages({
      'alternatives.match': 'hotelClass must be 1-5 or array of 1-5',
    }),
    amenities: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string())
    ),
    freeCancellation: Joi.boolean(),
    
    // Sorting
    sortBy: Joi.string().valid(
      'relevance',
      'price_asc',
      'price_desc',
      'rating',
      'distance',
      'popularity'
    ).default('relevance').messages({
      'any.only': 'sortBy must be one of: relevance, price_asc, price_desc, rating, distance, popularity',
    }),
    
    // Pagination
    page: pagination.page,
    limit: pagination.limit,
    
    // Legacy fields for backward compatibility
    location: Joi.string().trim().min(2).max(100),
    numberOfDays: Joi.number().integer().positive(),
  })
    .or('city', 'country', 'latitude', 'location') // At least one location param
    .and('latitude', 'longitude') // If latitude, longitude is also required
    .custom((value, helpers) => {
      // Support legacy checkInDate/checkOutDate
      if (value.checkInDate && !value.checkIn) {
        value.checkIn = value.checkInDate;
      }
      if (value.checkOutDate && !value.checkOut) {
        value.checkOut = value.checkOutDate;
      }
      
      // Support legacy location field (map to city)
      if (value.location && !value.city) {
        value.city = value.location;
      }

      // Validate date range (max 30 nights)
      const checkIn = new Date(value.checkIn);
      const checkOut = new Date(value.checkOut);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      
      if (nights > 30) {
        return helpers.error('any.custom', {
          message: 'Maximum stay duration is 30 nights',
        });
      }

      // Parse comma-separated hotelClass string to array
      if (typeof value.hotelClass === 'string') {
        value.hotelClass = value.hotelClass.split(',').map(c => parseInt(c.trim(), 10));
      }

      // Parse comma-separated amenities string to array
      if (typeof value.amenities === 'string') {
        value.amenities = value.amenities.split(',').map(a => a.trim().toUpperCase());
      }

      return value;
    })
    .messages({
      'object.missing': 'At least one location parameter (city, country, or latitude/longitude) is required',
      'object.and': 'Both latitude and longitude are required when using coordinates',
    }),
};

/**
 * GET /api/v1/search/hotels/:hotelId/availability
 * Check availability for a specific hotel
 */
exports.getHotelAvailability = {
  params: Joi.object({
    hotelId: Joi.string().uuid().required().messages({
      'string.guid': 'hotelId must be a valid UUID',
      'any.required': 'hotelId is required',
    }),
  }),
  query: Joi.object({
    checkIn: Joi.date().iso().greater('now').required().messages({
      'date.base': 'checkIn must be a valid date',
      'date.greater': 'checkIn must be in the future',
      'any.required': 'checkIn is required',
    }),
    checkOut: Joi.date().iso().greater(Joi.ref('checkIn')).required().messages({
      'date.base': 'checkOut must be a valid date',
      'date.greater': 'checkOut must be after checkIn',
      'any.required': 'checkOut is required',
    }),
    adults: Joi.number().integer().min(1).max(20).required().messages({
      'number.base': 'adults must be a number',
      'number.min': 'adults must be at least 1',
      'any.required': 'adults is required',
    }),
    children: Joi.number().integer().min(0).max(20).default(0),
    rooms: Joi.number().integer().min(1).max(10).default(1),
  }),
};

/**
 * GET /api/v1/search/autocomplete
 * Get autocomplete suggestions for hotel names
 */
exports.getAutocompleteSuggestions = {
  query: Joi.object({
    query: Joi.string().trim().min(2).max(100).required().messages({
      'string.base': 'query must be a string',
      'string.min': 'query must be at least 2 characters',
      'string.max': 'query must not exceed 100 characters',
      'any.required': 'query is required',
    }),
    limit: Joi.number().integer().min(1).max(20).default(10),
  }),
};

/**
 * POST /api/v1/search/log
 * Save search information to search logs
 */
exports.saveSearchInformation = {
  body: Joi.object({
    city: Joi.string().trim().min(2).max(100),
    country: Joi.string().trim().min(2).max(100),
    checkIn: Joi.date().iso().required(),
    checkOut: Joi.date().iso().required(),
    adults: Joi.number().integer().min(1).required(),
    children: Joi.number().integer().min(0).default(0),
    rooms: Joi.number().integer().min(1).default(1),
    nights: Joi.number().integer().min(1),
    
    // Legacy fields
    location: Joi.string().trim().min(2).max(100),
    checkInDate: Joi.date().iso(),
    checkOutDate: Joi.date().iso(),
    numberOfDays: Joi.number().integer().positive(),
    
    // Allow nested searchData for backward compatibility
    searchData: Joi.object().unknown(true),
  })
    .unknown(true) // Allow additional fields for flexibility
    .custom((value, helpers) => {
      // Support legacy nested searchData
      if (value.searchData) {
        return { ...value.searchData, ...value };
      }
      
      // Support legacy field names
      if (value.checkInDate && !value.checkIn) {
        value.checkIn = value.checkInDate;
      }
      if (value.checkOutDate && !value.checkOut) {
        value.checkOut = value.checkOutDate;
      }
      if (value.location && !value.city) {
        value.city = value.location;
      }
      if (value.numberOfDays && !value.nights) {
        value.nights = value.numberOfDays;
      }
      
      return value;
    }),
};
