const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
  const SearchLog = sequelize.define(
    'search_logs',
    {
      search_id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      search_time: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      adults: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      children: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      rooms: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      check_in_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      check_out_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'search_logs',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'search_id' }],
        },
      ],
    }
  );

  // SearchLog has no foreign key relationships based on init-models.js
  SearchLog.associate = function (models) {
    // No associations defined
  };

  return SearchLog;
};
