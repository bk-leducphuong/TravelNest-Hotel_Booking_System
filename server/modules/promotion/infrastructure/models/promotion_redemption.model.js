const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

const STATUSES = ['reserved', 'redeemed', 'released'];

module.exports = function (sequelize, DataTypes) {
  const PromotionRedemption = sequelize.define(
    'promotion_redemptions',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      promotion_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'promotions', key: 'id' },
      },
      booking_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'bookings', key: 'id' },
      },
      buyer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      hotel_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'hotels', key: 'id' },
      },
      status: {
        type: DataTypes.ENUM(...STATUSES),
        allowNull: false,
        defaultValue: 'reserved',
      },
      discount_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
      promotion_version: { type: DataTypes.INTEGER, allowNull: false },
      promotion_snapshot: { type: DataTypes.JSON, allowNull: true },
      reservation_expires_at: { type: DataTypes.DATE, allowNull: true },
      reserved_at: { type: DataTypes.DATE, allowNull: true },
      redeemed_at: { type: DataTypes.DATE, allowNull: true },
      released_at: { type: DataTypes.DATE, allowNull: true },
      release_reason: { type: DataTypes.STRING(100), allowNull: true },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    },
    {
      sequelize,
      tableName: 'promotion_redemptions',
      timestamps: false,
      paranoid: false,
      indexes: [
        { name: 'PRIMARY', unique: true, using: 'BTREE', fields: [{ name: 'id' }] },
        {
          name: 'promotion_redemptions_booking_unique',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'booking_id' }],
        },
        {
          name: 'promotion_redemptions_promotion_buyer_status',
          using: 'BTREE',
          fields: [{ name: 'promotion_id' }, { name: 'buyer_id' }, { name: 'status' }],
        },
        {
          name: 'promotion_redemptions_due',
          using: 'BTREE',
          fields: [{ name: 'status' }, { name: 'reservation_expires_at' }],
        },
        {
          name: 'promotion_redemptions_hotel_created',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }, { name: 'created_at' }],
        },
      ],
    }
  );

  PromotionRedemption.associate = function (models) {
    PromotionRedemption.belongsTo(models.promotions, {
      foreignKey: 'promotion_id',
      as: 'promotion',
    });
    PromotionRedemption.belongsTo(models.bookings, {
      foreignKey: 'booking_id',
      as: 'booking',
    });
    PromotionRedemption.belongsTo(models.users, { foreignKey: 'buyer_id', as: 'buyer' });
    PromotionRedemption.belongsTo(models.hotels, { foreignKey: 'hotel_id', as: 'hotel' });
  };

  return PromotionRedemption;
};

module.exports.STATUSES = STATUSES;
