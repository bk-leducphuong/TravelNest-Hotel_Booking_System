const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const PromotionRoom = sequelize.define(
    'promotion_rooms',
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
      room_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'rooms', key: 'id' },
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    },
    {
      sequelize,
      tableName: 'promotion_rooms',
      timestamps: false,
      paranoid: false,
      indexes: [
        { name: 'PRIMARY', unique: true, using: 'BTREE', fields: [{ name: 'id' }] },
        {
          name: 'promotion_rooms_unique',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'promotion_id' }, { name: 'room_id' }],
        },
      ],
    }
  );

  PromotionRoom.associate = function (models) {
    PromotionRoom.belongsTo(models.promotions, {
      foreignKey: 'promotion_id',
      as: 'promotion',
    });
    PromotionRoom.belongsTo(models.rooms, { foreignKey: 'room_id', as: 'room' });
  };

  return PromotionRoom;
};
