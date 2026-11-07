const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const PromotionUserUsage = sequelize.define(
    'promotion_user_usage',
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
      buyer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      reserved_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      redeemed_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
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
      tableName: 'promotion_user_usage',
      timestamps: false,
      paranoid: false,
      indexes: [
        { name: 'PRIMARY', unique: true, using: 'BTREE', fields: [{ name: 'id' }] },
        {
          name: 'promotion_user_usage_unique',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'promotion_id' }, { name: 'buyer_id' }],
        },
      ],
    }
  );

  PromotionUserUsage.associate = function (models) {
    PromotionUserUsage.belongsTo(models.promotions, {
      foreignKey: 'promotion_id',
      as: 'promotion',
    });
    PromotionUserUsage.belongsTo(models.users, { foreignKey: 'buyer_id', as: 'buyer' });
  };

  return PromotionUserUsage;
};
