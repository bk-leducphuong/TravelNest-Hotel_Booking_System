const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

const { PLACE_CATEGORIES } = require('../constants/hotels');

module.exports = function (sequelize, DataTypes) {
  const NearbyPlace = sequelize.define(
    'nearby_places',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      hotel_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'hotels',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Hotel this nearby place is associated with',
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Name of the place (e.g., "Central Park", "JFK Airport")',
      },
      category: {
        type: DataTypes.ENUM(...PLACE_CATEGORIES),
        allowNull: false,
        comment: 'Category of the place',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Optional description of the place',
      },
      address: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Street address of the place',
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: false,
        comment: 'Latitude with 7 decimal places (~1.11cm precision)',
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: false,
        comment: 'Longitude with 7 decimal places (~1.11cm precision)',
      },
      distance_km: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        comment: 'Distance from hotel in kilometers',
      },
      travel_time_minutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Estimated travel time from hotel in minutes',
      },
      travel_mode: {
        type: DataTypes.ENUM('walking', 'driving', 'public_transport'),
        allowNull: true,
        defaultValue: 'walking',
        comment: 'Mode of transportation for travel time estimate',
      },
      rating: {
        type: DataTypes.DECIMAL(2, 1),
        allowNull: true,
        validate: { min: 0, max: 5 },
        comment: 'Rating of the place (0-5 stars)',
      },
      google_place_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
        comment: 'Google Places API place ID for integration',
      },
      website_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Official website URL',
      },
      phone_number: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment: 'Contact phone number',
      },
      opening_hours: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Opening hours information (can be JSON string)',
      },
      price_level: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: { min: 1, max: 4 },
        comment: 'Price level indicator (1=cheap, 4=expensive)',
      },
      is_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this place has been verified by staff',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this place should be displayed',
      },
      display_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Order in which places should be displayed',
      },
      icon: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Icon identifier for UI display',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
      },
    },
    {
      sequelize,
      tableName: 'nearby_places',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'idx_hotel_id',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }],
          comment: 'Index for fetching places by hotel',
        },
        {
          name: 'idx_hotel_category',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }, { name: 'category' }],
          comment: 'Composite index for filtering by category',
        },
        {
          name: 'idx_hotel_active_distance',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }, { name: 'is_active' }, { name: 'distance_km' }],
          comment: 'Index for fetching active places ordered by distance',
        },
        {
          name: 'idx_coordinates',
          using: 'BTREE',
          fields: [{ name: 'latitude' }, { name: 'longitude' }],
          comment: 'Index for geospatial queries',
        },
        {
          name: 'idx_google_place_id',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'google_place_id' }],
          comment: 'Unique index for Google Place ID',
        },
      ],
    }
  );

  NearbyPlace.associate = function (models) {
    NearbyPlace.belongsTo(models.hotels, {
      foreignKey: 'hotel_id',
      as: 'hotel',
    });
  };

  return NearbyPlace;
};
