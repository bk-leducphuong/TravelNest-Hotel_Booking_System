const { uuidv7 } = require('uuidv7');

module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'payment_outbox',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: () => uuidv7() },
      event_key: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      event_type: { type: DataTypes.STRING(100), allowNull: false },
      payload: { type: DataTypes.JSON, allowNull: false },
      delivered_at: { type: DataTypes.DATE, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: 'payment_outbox', timestamps: false }
  );
