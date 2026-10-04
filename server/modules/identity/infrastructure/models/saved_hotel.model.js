const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
  const SavedHotel = sequelize.define(
    'saved_hotels',
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      hotel_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'hotels',
          key: 'id',
        },
      },
      saved_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    },
    {
      sequelize,
      tableName: 'saved_hotels',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'user_id',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'user_id' }, { name: 'hotel_id' }],
        },
        {
          name: 'fk_hotel',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }],
        },
      ],
    }
  );

  SavedHotel.associate = function (models) {
    SavedHotel.belongsTo(models.users, {
      foreignKey: 'user_id',
    });
    SavedHotel.belongsTo(models.hotels, {
      foreignKey: 'hotel_id',
    });
  };

  return SavedHotel;
};
