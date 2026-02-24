const express = require('express');
const {
  searchHotels,
  getHotelAvailability,
  getAutocompleteSuggestions,
  saveSearchInformation,
} = require('@controllers/v1/search.controller.js');
const validate = require('@middlewares/validate.middleware');
const searchSchema = require('@validators/v1/search.schema');
const router = express.Router();

/**
 * @swagger
 * /search/hotels:
 *   get:
 *     summary: Search hotels with hybrid ES + DB architecture
 *     description: |
 *       Search for available hotels using a hybrid architecture combining Elasticsearch for fast filtering
 *       and database queries for precise availability checking.
 *
 *       **Search Flow:**
 *       1. Elasticsearch finds candidate hotels based on location, price, amenities, etc.
 *       2. Database verifies date-specific room availability
 *       3. Results are merged, ranked, and paginated
 *     tags:
 *       - Search
 *     parameters:
 *       # Location parameters (at least one required)
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         description: City name (fuzzy search supported)
 *         example: "New York"
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         description: Country name
 *         example: "United States"
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Latitude for geo-search (requires longitude)
 *         example: 40.7128
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Longitude for geo-search (requires latitude)
 *         example: -74.0060
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Search radius in kilometers (used with lat/lon)
 *         example: 10
 *
 *       # Date parameters (required)
 *       - in: query
 *         name: checkIn
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Check-in date (ISO format, must be in future)
 *         example: "2026-03-15"
 *       - in: query
 *         name: checkOut
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Check-out date (ISO format, must be after checkIn)
 *         example: "2026-03-18"
 *
 *       # Guest parameters (required)
 *       - in: query
 *         name: adults
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *         description: Number of adult guests
 *         example: 2
 *       - in: query
 *         name: children
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 20
 *           default: 0
 *         description: Number of children
 *         example: 1
 *       - in: query
 *         name: rooms
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *           default: 1
 *         description: Number of rooms needed
 *         example: 1
 *
 *       # Filter parameters (optional)
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum price per night
 *         example: 100
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum price per night
 *         example: 500
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *         description: Minimum average rating
 *         example: 4.0
 *       - in: query
 *         name: hotelClass
 *         schema:
 *           oneOf:
 *             - type: integer
 *               minimum: 1
 *               maximum: 5
 *             - type: array
 *               items:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *         description: Hotel star rating (1-5) or array of ratings
 *         example: "4,5"
 *       - in: query
 *         name: amenities
 *         schema:
 *           oneOf:
 *             - type: string
 *             - type: array
 *               items:
 *                 type: string
 *         description: Required amenities (comma-separated or array)
 *         example: "FREE_WIFI,POOL,SPA"
 *       - in: query
 *         name: freeCancellation
 *         schema:
 *           type: boolean
 *         description: Filter hotels with free cancellation
 *         example: true
 *
 *       # Sorting parameters
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [relevance, price_asc, price_desc, rating, distance, popularity]
 *           default: relevance
 *         description: Sort order for results
 *         example: "rating"
 *
 *       # Pagination parameters
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Results per page
 *         example: 20
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     hotels:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           hotel_id:
 *                             type: string
 *                             format: uuid
 *                           hotel_name:
 *                             type: string
 *                           city:
 *                             type: string
 *                           country:
 *                             type: string
 *                           latitude:
 *                             type: number
 *                           longitude:
 *                             type: number
 *                           distance_km:
 *                             type: number
 *                             nullable: true
 *                           avg_rating:
 *                             type: number
 *                           review_count:
 *                             type: integer
 *                           hotel_class:
 *                             type: integer
 *                           amenity_codes:
 *                             type: array
 *                             items:
 *                               type: string
 *                           has_free_cancellation:
 *                             type: boolean
 *                           primary_image_url:
 *                             type: string
 *                             nullable: true
 *                           min_price_for_dates:
 *                             type: number
 *                             description: Minimum price for selected date range
 *                           available_rooms:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 room_id:
 *                                   type: string
 *                                 room_type:
 *                                   type: string
 *                                 max_guests:
 *                                   type: integer
 *                                 price_per_night:
 *                                   type: number
 *                                 total_price:
 *                                   type: number
 *                                 available_rooms:
 *                                   type: integer
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *                     filters_applied:
 *                       type: object
 *                     search_metadata:
 *                       type: object
 *                       properties:
 *                         es_candidates:
 *                           type: integer
 *                           description: Number of hotels found by Elasticsearch
 *                         available_hotels:
 *                           type: integer
 *                           description: Number of hotels with availability
 *                         search_time_ms:
 *                           type: integer
 *                           description: Total search time in milliseconds
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.get('/hotels', validate(searchSchema.searchHotels), searchHotels);

/**
 * @swagger
 * /search/hotels/{hotelId}/availability:
 *   get:
 *     summary: Check availability for a specific hotel
 *     description: Get detailed availability and room information for a specific hotel and date range
 *     tags:
 *       - Search
 *     parameters:
 *       - in: path
 *         name: hotelId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Hotel UUID
 *         example: "019c4592-457b-7872-9e2f-2a50ff6b9bbf"
 *       - in: query
 *         name: checkIn
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Check-in date (ISO format)
 *         example: "2026-03-15"
 *       - in: query
 *         name: checkOut
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Check-out date (ISO format)
 *         example: "2026-03-18"
 *       - in: query
 *         name: adults
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *         description: Number of adults
 *         example: 2
 *       - in: query
 *         name: children
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 20
 *           default: 0
 *         description: Number of children
 *         example: 0
 *       - in: query
 *         name: rooms
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *           default: 1
 *         description: Number of rooms
 *         example: 1
 *     responses:
 *       200:
 *         description: Hotel availability details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     hotel:
 *                       type: object
 *                       description: Hotel details from snapshot
 *                     availability:
 *                       type: object
 *                       properties:
 *                         is_available:
 *                           type: boolean
 *                         available_rooms:
 *                           type: array
 *                           items:
 *                             type: object
 *                         total_available_rooms:
 *                           type: integer
 *                     search_params:
 *                       type: object
 *       404:
 *         description: Hotel not available for selected dates
 *       400:
 *         description: Validation error
 */
router.get(
  '/hotels/:hotelId/availability',
  validate(searchSchema.getHotelAvailability),
  getHotelAvailability
);

/**
 * @swagger
 * /search/autocomplete:
 *   get:
 *     summary: Get autocomplete suggestions for hotel names
 *     description: Returns hotel name suggestions based on user input (powered by Elasticsearch)
 *     tags:
 *       - Search
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         description: Search query (minimum 2 characters)
 *         example: "Grand"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 10
 *         description: Maximum number of suggestions
 *         example: 10
 *     responses:
 *       200:
 *         description: Autocomplete suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           text:
 *                             type: string
 *                           score:
 *                             type: number
 *       400:
 *         description: Validation error
 */
router.get(
  '/autocomplete',
  validate(searchSchema.getAutocompleteSuggestions),
  getAutocompleteSuggestions
);

/**
 * @swagger
 * /search/log:
 *   post:
 *     summary: Save search information to analytics logs
 *     description: Records search queries for analytics and personalization (optional endpoint)
 *     tags:
 *       - Search
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - checkIn
 *               - checkOut
 *               - adults
 *             properties:
 *               city:
 *                 type: string
 *               country:
 *                 type: string
 *               checkIn:
 *                 type: string
 *                 format: date
 *               checkOut:
 *                 type: string
 *                 format: date
 *               adults:
 *                 type: integer
 *               children:
 *                 type: integer
 *               rooms:
 *                 type: integer
 *               nights:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Search log created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                     searchLog:
 *                       type: object
 *       400:
 *         description: Validation error
 */
router.post('/log', validate(searchSchema.saveSearchInformation), saveSearchInformation);

module.exports = router;
