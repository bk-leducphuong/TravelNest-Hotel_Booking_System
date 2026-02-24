const { Op } = require('sequelize');
const { Sequelize } = require('sequelize');

const { Hotels, ViewedHotels, Reviews, Bookings } = require('../models/index.js');
const searchLogClickHouseRepository = require('./clickhouse/search_log.repository');

/**
 * Home Repository - Contains all database operations for home page
 * Only repositories may import Sequelize models
 */

class HomeRepository {
  /**
   * Find viewed hotels by user ID
   */
  async findViewedHotelsByUserId(userId, limit = 10) {
    return await ViewedHotels.findAll({
      where: { user_id: userId },
      attributes: ['hotel_id'],
      order: [['viewed_at', 'DESC']],
      limit,
    });
  }

  /**
   * Find hotels by IDs
   */
  async findHotelsByIds(hotelIds) {
    if (!hotelIds || hotelIds.length === 0) {
      return [];
    }

    return await Hotels.findAll({
      where: {
        hotel_id: {
          [Op.in]: hotelIds,
        },
      },
      attributes: ['hotel_id', 'name', 'overall_rating', 'address', 'image_urls', 'city'],
    });
  }

  /**
   * Delete viewed hotel by user and hotel ID
   */
  async deleteViewedHotel(userId, hotelId) {
    return await ViewedHotels.destroy({
      where: {
        user_id: userId,
        hotel_id: hotelId,
      },
    });
  }

  /**
   * Count viewed hotels by user ID
   */
  async countViewedHotelsByUserId(userId) {
    return await ViewedHotels.count({
      where: {
        user_id: userId,
      },
    });
  }

  /**
   * Delete oldest viewed hotel for user
   */
  async deleteOldestViewedHotel(userId) {
    return await ViewedHotels.destroy({
      where: { user_id: userId },
      order: [['viewed_at', 'ASC']],
      limit: 1,
    });
  }

  /**
   * Create viewed hotel record
   */
  async createViewedHotel(userId, hotelId) {
    return await ViewedHotels.create({
      user_id: userId,
      hotel_id: hotelId,
      viewed_at: Sequelize.literal('CURRENT_TIMESTAMP'),
    });
  }

  /**
   * Find search logs by user ID (from ClickHouse)
   */
  async findSearchLogsByUserId(userId, limit = 10) {
    return await searchLogClickHouseRepository.findSearchLogsByUserId(userId, limit);
  }

  /**
   * Delete search log by ID (from ClickHouse)
   */
  async deleteSearchLogById(searchId) {
    return await searchLogClickHouseRepository.deleteSearchLogById(searchId);
  }

  /**
   * Find popular places (from ClickHouse materialized view)
   */
  async findPopularPlaces(limit = 5) {
    return await searchLogClickHouseRepository.findPopularPlaces(limit);
  }

  /**
   * Find nearby hotels by coordinates
   */
  async findNearbyHotels(latitude, longitude, radiusKm = 6) {
    const distanceFormula = Sequelize.literal(`
      (6371 * acos(
        cos(radians(${latitude})) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(${longitude})) + 
        sin(radians(${latitude})) * sin(radians(latitude))
      ))
    `);

    return await Hotels.findAll({
      attributes: {
        include: [[distanceFormula, 'distance']],
      },
      having: Sequelize.literal(`distance < ${radiusKm}`),
      order: [[Sequelize.literal('distance'), 'ASC']],
    });
  }

  /**
   * Find top rated hotels
   */
  async findTopRatedHotels(limit = 10, minRating = 4, minReviews = 5) {
    return await Hotels.findAll({
      attributes: [
        'hotel_id',
        'name',
        'address',
        'city',
        'overall_rating',
        'image_urls',
        'hotel_class',
        [Sequelize.fn('COUNT', Sequelize.col('reviews.review_id')), 'review_count'],
      ],
      include: [
        {
          model: Reviews,
          attributes: [],
          required: false,
        },
      ],
      where: {
        overall_rating: {
          [Op.gte]: minRating,
        },
      },
      group: ['hotel_id', 'name', 'address', 'city', 'overall_rating', 'image_urls', 'hotel_class'],
      having: Sequelize.literal(`COUNT(reviews.review_id) >= ${minReviews}`),
      order: [
        ['overall_rating', 'DESC'],
        [Sequelize.literal('review_count'), 'DESC'],
      ],
      limit,
    });
  }

  /**
   * Find recently viewed hotels with hotel details
   */
  async findRecentlyViewedHotelsWithDetails(userId, limit = 10) {
    return await ViewedHotels.findAll({
      include: [
        {
          model: Hotels,
          attributes: [
            'hotel_id',
            'name',
            'address',
            'city',
            'overall_rating',
            'image_urls',
            'hotel_class',
          ],
        },
      ],
      where: { user_id: userId },
      order: [['viewed_at', 'DESC']],
      limit,
    });
  }

  /**
   * Find popular destinations (cities with most hotels)
   */
  async findPopularDestinations(limit = 10, minHotels = 5) {
    return await Hotels.findAll({
      attributes: [
        'city',
        [Sequelize.fn('COUNT', Sequelize.col('hotel_id')), 'hotel_count'],
        [Sequelize.fn('AVG', Sequelize.col('overall_rating')), 'avg_rating'],
      ],
      group: ['city'],
      having: Sequelize.literal(`COUNT(hotel_id) >= ${minHotels}`),
      order: [
        [Sequelize.literal('hotel_count'), 'DESC'],
        [Sequelize.literal('avg_rating'), 'DESC'],
      ],
      limit,
    });
  }

  /**
   * Find trending hotels (based on views and bookings in last 30 days)
   */
  async findTrendingHotels(limit = 10, days = 30) {
    return await Hotels.findAll({
      attributes: [
        'hotel_id',
        'name',
        'address',
        'city',
        'overall_rating',
        'image_urls',
        'hotel_class',
        [Sequelize.fn('COUNT', Sequelize.col('viewed_hotels.view_id')), 'view_count'],
        [Sequelize.fn('COUNT', Sequelize.col('bookings.id')), 'booking_count'],
      ],
      include: [
        {
          model: ViewedHotels,
          attributes: [],
          required: false,
          where: {
            viewed_at: {
              [Op.gte]: Sequelize.literal(`NOW() - INTERVAL '${days} days'`),
            },
          },
        },
        {
          model: Bookings,
          attributes: [],
          required: false,
          where: {
            created_at: {
              [Op.gte]: Sequelize.literal(`NOW() - INTERVAL '${days} days'`),
            },
          },
        },
      ],
      group: ['hotel_id', 'name', 'address', 'city', 'overall_rating', 'image_urls', 'hotel_class'],
      order: [[Sequelize.literal('(view_count + booking_count * 2)'), 'DESC']],
      limit,
    });
  }
}

module.exports = new HomeRepository();
