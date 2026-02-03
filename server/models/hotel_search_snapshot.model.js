/**
 * Hotel Search Snapshot Model
 *
 * Purpose: Denormalized search index optimized for fast filtering and Elasticsearch sync
 * - One row per hotel
 * - No joins required at query time
 * - Updated asynchronously via events/jobs
 * - Synced to Elasticsearch for full-text search
 *
 * Use Cases:
 * - Fast location-based searches (map & distance)
 * - Date availability checking
 * - Price range filtering
 * - Rating and popularity sorting
 * - Amenity filtering
 */

const Sequelize = require('sequelize');

module.exports = function (sequelize, DataTypes) {
  const HotelSearchSnapshot = sequelize.define(
    'hotel_search_snapshots',
    {
      hotel_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'hotels',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'One-to-one with hotels table',
      },
      // Basic hotel information
      hotel_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Hotel name for display and search',
      },
      city: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'City for location filtering',
      },
      country: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Country for global search filtering',
      },
      // Geospatial data for distance calculations
      latitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: false,
        comment: 'Latitude for map search and distance calculations',
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: false,
        comment: 'Longitude for map search and distance calculations',
      },
      // Pricing data (denormalized from room_inventory)
      min_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Lowest available room price (updated from room_inventory)',
      },
      max_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Highest room price for range displays',
      },
      // Rating data (denormalized from hotel_rating_summaries)
      avg_rating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        defaultValue: 0.0,
        comment: 'Average rating for sorting and filtering',
      },
      review_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total review count for popularity sorting',
      },
      // Hotel classification
      hotel_class: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5,
        },
        comment: 'Star rating (1-5) for filtering',
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Hotel status for filtering out unavailable hotels',
      },
      // Amenities (denormalized from hotel_amenities)
      amenity_codes: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array of amenity codes for fast filtering without joins',
      },
      // Booking policies
      has_free_cancellation: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether hotel offers free cancellation on any rooms',
      },
      // Availability flag
      is_available: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Quick availability flag to short-circuit unavailable hotels',
      },
      has_available_rooms: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether hotel has any available rooms in inventory',
      },
      // Image for display
      primary_image_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Primary hotel image URL for quick display',
      },
      // Popularity metrics
      total_bookings: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total completed bookings for popularity scoring',
      },
      view_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total views for trending/popularity calculations',
      },
      // Timestamps
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
        comment: 'Timestamp for tracking when snapshot was last updated',
      },
    },
    {
      sequelize,
      tableName: 'hotel_search_snapshots',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }],
        },
        // Geospatial indexes for location search
        {
          name: 'idx_coordinates',
          using: 'BTREE',
          fields: [{ name: 'latitude' }, { name: 'longitude' }],
          comment: 'Index for geospatial queries',
        },
        // Location filters
        {
          name: 'idx_city',
          using: 'BTREE',
          fields: [{ name: 'city' }],
          comment: 'Index for city-based searches',
        },
        {
          name: 'idx_country',
          using: 'BTREE',
          fields: [{ name: 'country' }],
          comment: 'Index for country-based filtering',
        },
        // Price range filtering
        {
          name: 'idx_min_price',
          using: 'BTREE',
          fields: [{ name: 'min_price' }],
          comment: 'Index for price range filtering',
        },
        // Rating and popularity
        {
          name: 'idx_avg_rating',
          using: 'BTREE',
          fields: [{ name: 'avg_rating' }],
          comment: 'Index for rating-based sorting and filtering',
        },
        {
          name: 'idx_review_count',
          using: 'BTREE',
          fields: [{ name: 'review_count' }],
          comment: 'Index for popularity sorting',
        },
        // Hotel classification
        {
          name: 'idx_hotel_class',
          using: 'BTREE',
          fields: [{ name: 'hotel_class' }],
          comment: 'Index for star rating filtering',
        },
        // Status and availability
        {
          name: 'idx_status',
          using: 'BTREE',
          fields: [{ name: 'status' }],
          comment: 'Index for filtering active hotels',
        },
        {
          name: 'idx_is_available',
          using: 'BTREE',
          fields: [{ name: 'is_available' }],
          comment: 'Index for availability filtering',
        },
        // Composite indexes for common queries
        {
          name: 'idx_search_composite',
          using: 'BTREE',
          fields: [
            { name: 'status' },
            { name: 'is_available' },
            { name: 'city' },
            { name: 'avg_rating' },
          ],
          comment: 'Composite index for typical search queries',
        },
        {
          name: 'idx_price_rating',
          using: 'BTREE',
          fields: [{ name: 'min_price' }, { name: 'avg_rating' }],
          comment: 'Composite index for price-rating filtering',
        },
        // Popularity metrics
        {
          name: 'idx_popularity',
          using: 'BTREE',
          fields: [{ name: 'total_bookings' }, { name: 'view_count' }],
          comment: 'Index for popularity-based sorting',
        },
        // Update tracking
        {
          name: 'idx_updated_at',
          using: 'BTREE',
          fields: [{ name: 'updated_at' }],
          comment: 'Index for finding stale snapshots that need refresh',
        },
      ],
    }
  );

  HotelSearchSnapshot.associate = function (models) {
    HotelSearchSnapshot.belongsTo(models.hotels, {
      foreignKey: 'hotel_id',
      as: 'hotel',
    });
  };

  return HotelSearchSnapshot;
};
