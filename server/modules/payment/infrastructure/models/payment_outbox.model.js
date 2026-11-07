const { uuidv7 } = require('uuidv7');

module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'payment_outbox',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: () => uuidv7() },
      event_key: { type: DataTypes.STRING(255), allowNull: false },
      event_type: { type: DataTypes.STRING(100), allowNull: false },
      payload: { type: DataTypes.JSON, allowNull: false },
      delivered_at: { type: DataTypes.DATE, allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    {
      tableName: 'payment_outbox',
      timestamps: false,
      indexes: [
        {
          name: 'payment_outbox_event_key_unique',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'event_key' }],
        },
        {
          name: 'payment_outbox_delivery_due',
          using: 'BTREE',
          fields: [{ name: 'delivered_at' }, { name: 'created_at' }],
        },
      ],
    }
  );
