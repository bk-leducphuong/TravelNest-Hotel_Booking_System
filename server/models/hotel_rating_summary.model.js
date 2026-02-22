const Sequelize = require('sequelize');

module.exports = function (sequelize, DataTypes) {
  const HotelRatingSummary = sequelize.define(
    'hotel_rating_summaries',
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
        comment: 'One-to-one relationship with hotels',
      },
      // Overall metrics
      overall_rating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: 'Weighted average rating (0.00 to 10.00)',
      },
      total_reviews: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total number of reviews',
      },
      // Rating distribution (for displaying rating breakdown)
      rating_10: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Count of 10-star reviews (9.50-10.00)',
      },
      rating_9: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Count of 9-star reviews (8.50-9.49)',
      },
      rating_8: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Count of 8-star reviews (7.50-8.49)',
      },
      rating_7: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Count of 7-star reviews (6.50-7.49)',
      },
      rating_6: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Count of 6-star reviews (5.50-6.49)',
      },
      rating_5: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Count of 5-star reviews (4.50-5.49)',
      },
      rating_4: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Count of 4-star reviews (3.50-4.49)',
      },
      rating_3: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Count of 3-star reviews (2.50-3.49)',
      },
      rating_2: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Count of 2-star reviews (1.50-2.49)',
      },
      rating_1: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Count of 1-star reviews (0.00-1.49)',
      },
      // Additional metrics for more detailed analysis
      total_rating_sum: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: 'Sum of all ratings (for recalculating average)',
      },
      // Recent activity tracking
      last_review_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Date of the most recent review',
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
      },
    },
    {
      sequelize,
      tableName: 'hotel_rating_summaries',
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
        {
          name: 'idx_overall_rating',
          using: 'BTREE',
          fields: [{ name: 'overall_rating' }],
          comment: 'Index for sorting and filtering by rating',
        },
        {
          name: 'idx_total_reviews',
          using: 'BTREE',
          fields: [{ name: 'total_reviews' }],
          comment: 'Index for filtering by review count',
        },
        {
          name: 'idx_rating_reviews_composite',
          using: 'BTREE',
          fields: [{ name: 'overall_rating' }, { name: 'total_reviews' }],
          comment: 'Composite index for rating + review count filtering',
        },
        {
          name: 'idx_last_review_date',
          using: 'BTREE',
          fields: [{ name: 'last_review_date' }],
          comment: 'Index for finding recently reviewed hotels',
        },
      ],
    }
  );

  HotelRatingSummary.associate = function (models) {
    HotelRatingSummary.belongsTo(models.hotels, {
      foreignKey: 'hotel_id',
      as: 'hotel',
    });
  };

  return HotelRatingSummary;
};
