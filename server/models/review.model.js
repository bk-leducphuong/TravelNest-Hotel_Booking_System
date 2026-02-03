const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
  const Review = sequelize.define(
    'reviews',
    {
      review_id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      hotel_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'hotels',
          key: 'id',
        },
      },
      rating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: false,
        validate: {
          min: 0.00,
          max: 10.00,
        },
        comment: 'Review rating with precision up to 2 decimal places (e.g., 4.75)',
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      booking_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      booking_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'bookings',
          key: 'id',
        },
      },
      reply: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      number_of_likes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      number_of_dislikes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      tableName: 'reviews',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'review_id' }],
        },
        {
          name: 'user_id',
          using: 'BTREE',
          fields: [{ name: 'user_id' }],
        },
        {
          name: 'hotel_id',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }],
        },
      ],
    }
  );

  Review.associate = function (models) {
    Review.belongsTo(models.users, {
      foreignKey: 'user_id',
    });
    Review.belongsTo(models.hotels, {
      foreignKey: 'hotel_id',
    });
    Review.belongsTo(models.bookings, {
      foreignKey: 'booking_id',
    });
    Review.hasMany(models.review_criterias, {
      foreignKey: 'review_id',
    });
  };

  return Review;
};
