'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('nearby_places', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      hotel_id: {
        type: Sequelize.UUID,
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
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Name of the place (e.g., "Central Park", "JFK Airport")',
      },
      category: {
        type: Sequelize.ENUM(
          'restaurant',
          'cafe',
          'bar',
          'shopping',
          'attraction',
          'museum',
          'park',
          'beach',
          'airport',
          'train_station',
          'bus_station',
          'hospital',
          'pharmacy',
          'bank',
          'atm',
          'gas_station',
          'parking',
          'gym',
          'spa',
          'entertainment',
          'landmark',
          'religious',
          'school',
          'other'
        ),
        allowNull: false,
        comment: 'Category of the place',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Optional description of the place',
      },
      address: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Street address of the place',
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: false,
        comment: 'Latitude with 7 decimal places (~1.11cm precision)',
      },
      longitude: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: false,
        comment: 'Longitude with 7 decimal places (~1.11cm precision)',
      },
      distance_km: {
        type: Sequelize.DECIMAL(6, 2),
        allowNull: false,
        comment: 'Distance from hotel in kilometers',
      },
      travel_time_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Estimated travel time from hotel in minutes',
      },
      travel_mode: {
        type: Sequelize.ENUM('walking', 'driving', 'public_transport'),
        allowNull: true,
        defaultValue: 'walking',
        comment: 'Mode of transportation for travel time estimate',
      },
      rating: {
        type: Sequelize.DECIMAL(2, 1),
        allowNull: true,
        comment: 'Rating of the place (0-5 stars)',
      },
      google_place_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true,
        comment: 'Google Places API place ID for integration',
      },
      website_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Official website URL',
      },
      phone_number: {
        type: Sequelize.STRING(30),
        allowNull: true,
        comment: 'Contact phone number',
      },
      opening_hours: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Opening hours information (can be JSON string)',
      },
      price_level: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Price level indicator (1=cheap, 4=expensive)',
      },
      is_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this place has been verified by staff',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this place should be displayed',
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Order in which places should be displayed',
      },
      icon: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Icon identifier for UI display',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('nearby_places', ['hotel_id'], {
      name: 'idx_hotel_id',
      comment: 'Index for fetching places by hotel',
    });

    await queryInterface.addIndex('nearby_places', ['hotel_id', 'category'], {
      name: 'idx_hotel_category',
      comment: 'Composite index for filtering by category',
    });

    await queryInterface.addIndex(
      'nearby_places',
      ['hotel_id', 'is_active', 'distance_km'],
      {
        name: 'idx_hotel_active_distance',
        comment: 'Index for fetching active places ordered by distance',
      }
    );

    await queryInterface.addIndex('nearby_places', ['latitude', 'longitude'], {
      name: 'idx_coordinates',
      comment: 'Index for geospatial queries',
    });

    await queryInterface.addIndex('nearby_places', ['google_place_id'], {
      name: 'idx_google_place_id',
      unique: true,
      comment: 'Unique index for Google Place ID',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('nearby_places');
  },
};
