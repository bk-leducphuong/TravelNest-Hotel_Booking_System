const Sequelize = require('sequelize');

module.exports = function (sequelize, DataTypes) {
  // Composite-PK join table: one read cursor per (conversation, reader).
  const ConversationRead = sequelize.define(
    'conversation_reads',
    {
      conversation_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: 'conversations', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      last_read_seq: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
      },
      last_notified_seq: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
        comment: 'Highest sequence already reported out-of-band (dedupes email/socket alerts)',
      },
      muted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
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
      tableName: 'conversation_reads',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [{ name: 'conversation_reads_user', fields: [{ name: 'user_id' }] }],
    }
  );

  ConversationRead.associate = function (models) {
    ConversationRead.belongsTo(models.conversations, {
      foreignKey: 'conversation_id',
      as: 'conversation',
    });
    ConversationRead.belongsTo(models.users, { foreignKey: 'user_id', as: 'reader' });
  };

  return ConversationRead;
};
