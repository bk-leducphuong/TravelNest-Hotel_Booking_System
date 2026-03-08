const { Op, Sequelize } = require('sequelize');

const {
  hotel_search_snapshots,
  hotels,
  cities,
  countries,
  room_inventory,
  hotel_amenities,
  amenities,
  images,
  rooms,
  hotel_rating_summaries,
} = require('../models');

/**
 * HotelSearchSnapshot Repository - Contains all database operations for hotel search snapshots
 * Only repositories may import Sequelize models
 */

class HotelSearchSnapshotRepository {
  /**
   * Create or update hotel search snapshot
   */
  async upsertSnapshot(hotelId, data) {
    return await hotel_search_snapshots.upsert({
      hotel_id: hotelId,
      ...data,
    });
  }

  /**
   * Create initial empty snapshot for new hotel
   */
  async createInitialSnapshot(hotelId, hotelData) {
    return await hotel_search_snapshots.create({
      hotel_id: hotelId,
      hotel_name: hotelData.name,
      city_id: hotelData.city_id || null,
      country_id: hotelData.country_id || null,
      city: hotelData.city || hotelData.city_name || null,
      country: hotelData.country || hotelData.country_name || null,
      latitude: hotelData.latitude,
      longitude: hotelData.longitude,
      hotel_class: hotelData.hotel_class,
      status: hotelData.status || 'active',
      is_available: false,
      has_available_rooms: false,
      min_price: null,
      max_price: null,
      avg_rating: 0.0,
      review_count: 0,
      amenity_codes: [],
      has_free_cancellation: false,
      total_bookings: 0,
      view_count: 0,
    });
  }

  /**
   * Recompute pricing from room inventory
   */
  async recomputePricing(hotelId) {
    const now = new Date();

    const hotelRooms = await rooms.findAll({
      where: { hotel_id: hotelId },
      attributes: ['id'],
    });

    const roomIds = hotelRooms.map((r) => r.id);

    if (roomIds.length === 0) {
      return { min_price: null, max_price: null, has_available_rooms: false };
    }

    const priceData = await room_inventory.findOne({
      where: {
        room_id: { [Op.in]: roomIds },
        date: { [Op.gte]: now },
        status: 'open',
        [Sequelize.literal]: Sequelize.literal('booked_rooms < total_rooms'),
      },
      attributes: [
        [Sequelize.fn('MIN', Sequelize.col('price_per_night')), 'min_price'],
        [Sequelize.fn('MAX', Sequelize.col('price_per_night')), 'max_price'],
        [Sequelize.fn('COUNT', Sequelize.col('room_id')), 'count'],
      ],
      raw: true,
    });

    return {
      min_price: priceData?.min_price || null,
      max_price: priceData?.max_price || null,
      has_available_rooms: (priceData?.count || 0) > 0,
    };
  }

  /**
   * Recompute rating from hotel_rating_summaries
   */
  async recomputeRating(hotelId) {
    const ratingSummary = await hotel_rating_summaries.findOne({
      where: { hotel_id: hotelId },
      attributes: ['overall_rating', 'total_reviews'],
      raw: true,
    });

    return {
      avg_rating: ratingSummary?.overall_rating || 0.0,
      review_count: ratingSummary?.total_reviews || 0,
    };
  }

  /**
   * Recompute amenities from hotel_amenities junction table
   */
  async recomputeAmenities(hotelId) {
    const amenityData = await hotel_amenities.findAll({
      where: {
        hotel_id: hotelId,
        is_available: true,
      },
      include: [
        {
          model: amenities,
          as: 'amenity',
          attributes: ['code'],
        },
      ],
      raw: true,
    });

    const amenityCodes = amenityData.map((a) => a['amenity.code']).filter(Boolean);

    return { amenity_codes: amenityCodes };
  }

  /**
   * Check if hotel has any free cancellation options
   */
  async checkFreeCancellation(hotelId) {
    return { has_free_cancellation: false };
  }

  /**
   * Get hotel basic info for snapshot
   */
  async getHotelBasicInfo(hotelId) {
    const hotel = await hotels.findByPk(hotelId, {
      attributes: [
        'id',
        'name',
        'city_id',
        'country_id',
        'latitude',
        'longitude',
        'hotel_class',
        'status',
      ],
      include: [
        {
          model: cities,
          as: 'city',
          attributes: ['id', 'name', 'slug'],
          required: false,
        },
        {
          model: countries,
          as: 'country',
          attributes: ['id', 'name', 'iso_code'],
          required: false,
        },
      ],
    });

    if (!hotel) {
      throw new Error(`Hotel ${hotelId} not found`);
    }

    const city = hotel.city || null;
    const country = hotel.country || null;

    return {
      hotel_name: hotel.name,
      city_id: hotel.city_id || (city && city.id) || null,
      city: city ? city.name : null,
      country_id: hotel.country_id || (country && country.id) || null,
      country: country ? country.name : null,
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      hotel_class: hotel.hotel_class,
      status: hotel.status,
    };
  }

  /**
   * Get primary image URL for hotel
   */
  async getPrimaryImageUrl(hotelId) {
    const primaryImage = await images.findOne({
      where: {
        entity_type: 'hotel',
        entity_id: hotelId,
        is_primary: true,
        status: 'active',
      },
      attributes: ['object_key', 'bucket_name'],
      raw: true,
    });

    if (primaryImage) {
      return {
        primary_image_url: primaryImage.object_key,
      };
    }

    return { primary_image_url: null };
  }

  /**
   * Full snapshot refresh - recompute everything
   */
  async fullRefresh(hotelId) {
    const [basicInfo, pricingData, ratingData, amenityData, imageData, freeCancelData] =
      await Promise.all([
        this.getHotelBasicInfo(hotelId),
        this.recomputePricing(hotelId),
        this.recomputeRating(hotelId),
        this.recomputeAmenities(hotelId),
        this.getPrimaryImageUrl(hotelId),
        this.checkFreeCancellation(hotelId),
      ]);

    const snapshotData = {
      ...basicInfo,
      ...pricingData,
      ...ratingData,
      ...amenityData,
      ...imageData,
      ...freeCancelData,
      is_available: pricingData.has_available_rooms && basicInfo.status === 'active',
    };

    return await this.upsertSnapshot(hotelId, snapshotData);
  }

  /**
   * Partial update - only update specific fields
   */
  async partialUpdate(hotelId, fields) {
    return await hotel_search_snapshots.update(fields, {
      where: { hotel_id: hotelId },
    });
  }

  /**
   * Get snapshot by hotel ID
   */
  async getByHotelId(hotelId) {
    return await hotel_search_snapshots.findByPk(hotelId);
  }

  /**
   * Increment view count
   */
  async incrementViewCount(hotelId) {
    return await hotel_search_snapshots.increment('view_count', {
      where: { hotel_id: hotelId },
    });
  }

  /**
   * Increment booking count
   */
  async incrementBookingCount(hotelId) {
    return await hotel_search_snapshots.increment('total_bookings', {
      where: { hotel_id: hotelId },
    });
  }
}

module.exports = new HotelSearchSnapshotRepository();
