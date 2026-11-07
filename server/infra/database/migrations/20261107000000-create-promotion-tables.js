'use strict';

const {
  addColumnIfMissing,
  addIndexIfMissing,
  createTableIfMissing,
} = require('../migration-utils/schema');

const PROMOTION_MODES = ['automatic', 'code'];
const PROMOTION_STATUSES = ['draft', 'active', 'paused', 'archived'];
const DISCOUNT_TYPES = ['percentage', 'fixed'];
const ROOM_SCOPES = ['all', 'selected'];
const REDEMPTION_STATUSES = ['reserved', 'redeemed', 'released'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await createTableIfMissing(queryInterface, 'promotions', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      hotel_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'hotels', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      mode: {
        type: Sequelize.ENUM(...PROMOTION_MODES),
        allowNull: false,
        defaultValue: 'automatic',
      },
      code: { type: Sequelize.STRING(64), allowNull: true },
      normalized_code: { type: Sequelize.STRING(64), allowNull: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.ENUM(...PROMOTION_STATUSES),
        allowNull: false,
        defaultValue: 'draft',
      },
      discount_type: {
        type: Sequelize.ENUM(...DISCOUNT_TYPES),
        allowNull: false,
      },
      discount_value: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      discount_basis_points: { type: Sequelize.INTEGER, allowNull: true },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'USD' },
      max_discount_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      room_scope: {
        type: Sequelize.ENUM(...ROOM_SCOPES),
        allowNull: false,
        defaultValue: 'all',
      },
      booking_starts_at: { type: Sequelize.DATE, allowNull: true },
      booking_ends_at: { type: Sequelize.DATE, allowNull: true },
      stay_starts_on: { type: Sequelize.DATEONLY, allowNull: true },
      stay_ends_on: { type: Sequelize.DATEONLY, allowNull: true },
      min_nights: { type: Sequelize.INTEGER, allowNull: true },
      min_subtotal: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      min_advance_days: { type: Sequelize.INTEGER, allowNull: true },
      total_use_limit: { type: Sequelize.INTEGER, allowNull: true },
      per_user_limit: { type: Sequelize.INTEGER, allowNull: true },
      reserved_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      redeemed_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      created_by: { type: Sequelize.UUID, allowNull: true },
      updated_by: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await addIndexIfMissing(queryInterface, 'promotions', ['hotel_id', 'normalized_code'], {
      name: 'promotions_hotel_code_unique',
      unique: true,
    });
    await addIndexIfMissing(queryInterface, 'promotions', ['hotel_id', 'mode', 'status'], {
      name: 'promotions_hotel_mode_status',
    });
    await addIndexIfMissing(
      queryInterface,
      'promotions',
      ['status', 'mode', 'booking_starts_at', 'booking_ends_at'],
      {
        name: 'promotions_active_window',
      }
    );
    await addIndexIfMissing(
      queryInterface,
      'promotions',
      ['hotel_id', 'status', 'stay_starts_on', 'stay_ends_on'],
      {
        name: 'promotions_hotel_stay_window',
      }
    );

    await createTableIfMissing(queryInterface, 'promotion_rooms', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      promotion_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'promotions', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      room_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'rooms', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });

    await addIndexIfMissing(queryInterface, 'promotion_rooms', ['promotion_id', 'room_id'], {
      name: 'promotion_rooms_unique',
      unique: true,
    });
    await addIndexIfMissing(queryInterface, 'promotion_rooms', ['room_id'], {
      name: 'promotion_rooms_room_id',
    });

    await createTableIfMissing(queryInterface, 'promotion_redemptions', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      promotion_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'promotions', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      booking_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'bookings', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      buyer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      hotel_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'hotels', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      status: {
        type: Sequelize.ENUM(...REDEMPTION_STATUSES),
        allowNull: false,
        defaultValue: 'reserved',
      },
      discount_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'USD' },
      promotion_version: { type: Sequelize.INTEGER, allowNull: false },
      promotion_snapshot: { type: Sequelize.JSON, allowNull: true },
      reservation_expires_at: { type: Sequelize.DATE, allowNull: true },
      reserved_at: { type: Sequelize.DATE, allowNull: true },
      redeemed_at: { type: Sequelize.DATE, allowNull: true },
      released_at: { type: Sequelize.DATE, allowNull: true },
      release_reason: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await addIndexIfMissing(queryInterface, 'promotion_redemptions', ['booking_id'], {
      name: 'promotion_redemptions_booking_unique',
      unique: true,
    });
    await addIndexIfMissing(
      queryInterface,
      'promotion_redemptions',
      ['promotion_id', 'buyer_id', 'status'],
      {
        name: 'promotion_redemptions_promotion_buyer_status',
      }
    );
    await addIndexIfMissing(
      queryInterface,
      'promotion_redemptions',
      ['status', 'reservation_expires_at'],
      {
        name: 'promotion_redemptions_due',
      }
    );
    await addIndexIfMissing(queryInterface, 'promotion_redemptions', ['hotel_id', 'created_at'], {
      name: 'promotion_redemptions_hotel_created',
    });

    await createTableIfMissing(queryInterface, 'promotion_user_usage', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      promotion_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'promotions', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      buyer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      reserved_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      redeemed_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await addIndexIfMissing(queryInterface, 'promotion_user_usage', ['promotion_id', 'buyer_id'], {
      name: 'promotion_user_usage_unique',
      unique: true,
    });

    await addColumnIfMissing(queryInterface, 'bookings', 'discount_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await addColumnIfMissing(queryInterface, 'bookings', 'promotion_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'promotions', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
    await addColumnIfMissing(queryInterface, 'bookings', 'pricing_fingerprint', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await addIndexIfMissing(queryInterface, 'bookings', ['promotion_id'], {
      name: 'bookings_promotion_id',
    });

    await addColumnIfMissing(queryInterface, 'holds', 'discount_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await addColumnIfMissing(queryInterface, 'holds', 'pricing_fingerprint', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('bookings', 'bookings_promotion_id');
    await queryInterface.removeColumn('bookings', 'pricing_fingerprint');
    await queryInterface.removeColumn('bookings', 'promotion_id');
    await queryInterface.removeColumn('bookings', 'discount_amount');
    await queryInterface.removeColumn('holds', 'pricing_fingerprint');
    await queryInterface.removeColumn('holds', 'discount_amount');
    await queryInterface.dropTable('promotion_user_usage');
    await queryInterface.dropTable('promotion_redemptions');
    await queryInterface.dropTable('promotion_rooms');
    await queryInterface.dropTable('promotions');
  },
};
