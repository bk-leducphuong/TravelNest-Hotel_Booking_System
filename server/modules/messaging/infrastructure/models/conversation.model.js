const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const Conversation = sequelize.define(
    'conversations',
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
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Hotel the thread belongs to; access is granted per hotel, not per user',
      },
      booking_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'bookings', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'One thread per booking. NULL is reserved for hotel-level inquiries.',
      },
      guest_user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Guest participant (the booking buyer)',
      },
      last_message_seq: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
        comment: 'Monotonic per-thread message counter; orders and pages messages',
      },
      last_message_at: {
        type: DataTypes.DATE(6),
        allowNull: true,
        comment: 'Denormalized so inboxes can sort without joining messages',
      },
      last_message_preview: {
        type: DataTypes.STRING(280),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('open', 'archived'),
        allowNull: false,
        defaultValue: 'open',
      },
      created_at: {
        type: DataTypes.DATE(6),
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP(6)'),
      },
      updated_at: {
        type: DataTypes.DATE(6),
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP(6)'),
      },
    },
    {
      sequelize,
      tableName: 'conversations',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        { name: 'conversations_booking_unique', unique: true, fields: [{ name: 'booking_id' }] },
        {
          name: 'conversations_hotel_last_message',
          fields: [{ name: 'hotel_id' }, { name: 'last_message_at' }],
        },
        {
          name: 'conversations_guest_last_message',
          fields: [{ name: 'guest_user_id' }, { name: 'last_message_at' }],
        },
      ],
    }
  );

  Conversation.associate = function (models) {
    Conversation.belongsTo(models.hotels, { foreignKey: 'hotel_id', as: 'hotel' });
    Conversation.belongsTo(models.bookings, { foreignKey: 'booking_id', as: 'booking' });
    Conversation.belongsTo(models.users, { foreignKey: 'guest_user_id', as: 'guest' });
    Conversation.hasMany(models.messages, { foreignKey: 'conversation_id', as: 'messages' });
  };

  return Conversation;
};
