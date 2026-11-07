const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

const MODES = ['automatic', 'code'];
const STATUSES = ['draft', 'active', 'paused', 'archived'];
const DISCOUNT_TYPES = ['percentage', 'fixed'];
const ROOM_SCOPES = ['all', 'selected'];

module.exports = function (sequelize, DataTypes) {
  const Promotion = sequelize.define(
    'promotions',
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
        references: { model: 'hotels', key: 'id' },
      },
      mode: {
        type: DataTypes.ENUM(...MODES),
        allowNull: false,
        defaultValue: 'automatic',
      },
      code: { type: DataTypes.STRING(64), allowNull: true },
      normalized_code: { type: DataTypes.STRING(64), allowNull: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM(...STATUSES),
        allowNull: false,
        defaultValue: 'draft',
      },
      discount_type: {
        type: DataTypes.ENUM(...DISCOUNT_TYPES),
        allowNull: false,
      },
      discount_value: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      discount_basis_points: { type: DataTypes.INTEGER, allowNull: true },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
      max_discount_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      room_scope: {
        type: DataTypes.ENUM(...ROOM_SCOPES),
        allowNull: false,
        defaultValue: 'all',
      },
      booking_starts_at: { type: DataTypes.DATE, allowNull: true },
      booking_ends_at: { type: DataTypes.DATE, allowNull: true },
      stay_starts_on: { type: DataTypes.DATEONLY, allowNull: true },
      stay_ends_on: { type: DataTypes.DATEONLY, allowNull: true },
      min_nights: { type: DataTypes.INTEGER, allowNull: true },
      min_subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      min_advance_days: { type: DataTypes.INTEGER, allowNull: true },
      total_use_limit: { type: DataTypes.INTEGER, allowNull: true },
      per_user_limit: { type: DataTypes.INTEGER, allowNull: true },
      reserved_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      redeemed_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      created_by: { type: DataTypes.UUID, allowNull: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
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
      tableName: 'promotions',
      timestamps: false,
      paranoid: false,
      indexes: [
        { name: 'PRIMARY', unique: true, using: 'BTREE', fields: [{ name: 'id' }] },
        {
          name: 'promotions_hotel_code_unique',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }, { name: 'normalized_code' }],
        },
        {
          name: 'promotions_hotel_mode_status',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }, { name: 'mode' }, { name: 'status' }],
        },
        {
          name: 'promotions_active_window',
          using: 'BTREE',
          fields: [
            { name: 'status' },
            { name: 'mode' },
            { name: 'booking_starts_at' },
            { name: 'booking_ends_at' },
          ],
        },
      ],
    }
  );

  Promotion.associate = function (models) {
    Promotion.belongsTo(models.hotels, { foreignKey: 'hotel_id', as: 'hotel' });
    Promotion.belongsTo(models.users, { foreignKey: 'created_by', as: 'creator' });
    Promotion.belongsTo(models.users, { foreignKey: 'updated_by', as: 'updater' });
    Promotion.hasMany(models.promotion_rooms, {
      foreignKey: 'promotion_id',
      as: 'promotionRooms',
    });
    Promotion.hasMany(models.promotion_redemptions, {
      foreignKey: 'promotion_id',
      as: 'redemptions',
    });
    Promotion.hasMany(models.promotion_user_usage, {
      foreignKey: 'promotion_id',
      as: 'userUsage',
    });
  };

  return Promotion;
};

module.exports.MODES = MODES;
module.exports.STATUSES = STATUSES;
module.exports.DISCOUNT_TYPES = DISCOUNT_TYPES;
module.exports.ROOM_SCOPES = ROOM_SCOPES;
