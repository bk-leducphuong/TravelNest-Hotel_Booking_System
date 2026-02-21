const { uuidv7 } = require('uuidv7');
const { REVIEW_STATUSES } = require('../constants/reviews');

module.exports = function (sequelize, DataTypes) {
  const Review = sequelize.define(
    'reviews',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      hotel_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'hotels', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      booking_id: {
        type: DataTypes.UUID,
        allowNull: true,
        unique: true,
        references: { model: 'bookings', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        comment: 'Optional link to booking (verified review)',
      },
      // Ratings (1-10 scale for finer granularity)
      rating_overall: {
        type: DataTypes.DECIMAL(3, 1),
        allowNull: false,
        validate: { min: 1, max: 10 },
        comment: 'Overall rating 1.0-10.0',
      },
      rating_cleanliness: {
        type: DataTypes.DECIMAL(3, 1),
        allowNull: true,
        validate: { min: 1, max: 10 },
      },
      rating_location: {
        type: DataTypes.DECIMAL(3, 1),
        allowNull: true,
        validate: { min: 1, max: 10 },
      },
      rating_service: {
        type: DataTypes.DECIMAL(3, 1),
        allowNull: true,
        validate: { min: 1, max: 10 },
      },
      rating_value: {
        type: DataTypes.DECIMAL(3, 1),
        allowNull: true,
        validate: { min: 1, max: 10 },
      },
      // Content
      title: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Metadata
      status: {
        type: DataTypes.ENUM(...REVIEW_STATUSES),
        allowNull: false,
        defaultValue: 'published',
      },
      is_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'True if linked to a completed booking',
      },
      helpful_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Denormalized count of helpful votes',
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
      tableName: 'reviews',
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
        },
        {
          name: 'idx_user_id',
          using: 'BTREE',
          fields: [{ name: 'user_id' }],
        },
        {
          name: 'idx_hotel_status',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }, { name: 'status' }],
          comment: 'For fetching published reviews by hotel',
        },
        {
          name: 'idx_hotel_rating',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }, { name: 'rating_overall' }],
          comment: 'For sorting reviews by rating',
        },
        {
          name: 'idx_created_at',
          using: 'BTREE',
          fields: [{ name: 'created_at' }],
        },
      ],
    }
  );

  Review.associate = function (models) {
    Review.belongsTo(models.users, { foreignKey: 'user_id', as: 'user' });
    Review.belongsTo(models.hotels, { foreignKey: 'hotel_id', as: 'hotel' });
    Review.belongsTo(models.bookings, {
      foreignKey: 'booking_id',
      as: 'booking',
    });
    Review.hasOne(models.review_replies, {
      foreignKey: 'review_id',
      as: 'reply',
    });
    Review.hasMany(models.review_media, {
      foreignKey: 'review_id',
      as: 'media',
    });
    Review.hasMany(models.review_helpful_votes, {
      foreignKey: 'review_id',
      as: 'helpful_votes',
    });
  };

  return Review;
};
