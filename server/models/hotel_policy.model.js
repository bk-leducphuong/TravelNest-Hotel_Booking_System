const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');
const { POLICY_TYPES } = require('../constants/hotels');

module.exports = function (sequelize, DataTypes) {
  const HotelPolicy = sequelize.define(
    'hotel_policies',
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
        comment: 'Hotel this policy belongs to',
      },
      policy_type: {
        type: DataTypes.ENUM(...POLICY_TYPES),
        allowNull: false,
        comment: 'Type of policy (cancellation, children, pets, etc.)',
      },
      title: {
        type: DataTypes.STRING(150),
        allowNull: false,
        comment: 'Policy title (e.g., "Cancellation Policy")',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Detailed policy description',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this policy is currently active',
      },
      display_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Order in which policies should be displayed',
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
      tableName: 'hotel_policies',
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
          comment: 'Index for fetching policies by hotel',
        },
        {
          name: 'idx_hotel_policy_type',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }, { name: 'policy_type' }],
          comment: 'Composite index for finding specific policy types',
        },
        {
          name: 'idx_hotel_active_order',
          using: 'BTREE',
          fields: [
            { name: 'hotel_id' },
            { name: 'is_active' },
            { name: 'display_order' },
          ],
          comment: 'Index for fetching active policies in display order',
        },
      ],
    }
  );

  HotelPolicy.associate = function (models) {
    HotelPolicy.belongsTo(models.hotels, {
      foreignKey: 'hotel_id',
      as: 'hotel',
    });
  };

  return HotelPolicy;
};
