const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const Notification = sequelize.define(
    'notifications',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },

      // Receiver information - now supports users (customers and hotel owners)
      receiver_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        comment: 'User receiving the notification (customer or hotel owner)',
      },

      // Sender information - optional, can be system-generated
      sender_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        comment: 'User who triggered the notification (null for system notifications)',
      },

      // Notification classification
      notification_type: {
        type: DataTypes.ENUM(
          'booking_new',
          'booking_confirmed',
          'booking_cancelled',
          'booking_completed',
          'booking_status_update',
          'payment_success',
          'payment_failed',
          'payment_refund',
          'payout_completed',
          'payout_failed',
          'review_new',
          'review_response',
          'message_new',
          'system_alert',
          'promotion',
          'account_update'
        ),
        allowNull: false,
        comment: 'Type of notification for categorization and filtering',
      },

      // Notification category for grouping
      category: {
        type: DataTypes.ENUM('booking', 'payment', 'review', 'message', 'system', 'marketing'),
        allowNull: false,
        defaultValue: 'system',
        comment: 'High-level category for UI grouping',
      },

      // Priority level
      priority: {
        type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'normal',
        comment: 'Priority level affects display order and UI treatment',
      },

      // Content
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Short notification title/subject',
      },

      message: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Full notification message body',
      },

      // Metadata for rich notifications
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional data: booking_id, amount, dates, etc.',
      },

      // Related entity (polymorphic association)
      related_entity_type: {
        type: DataTypes.ENUM(
          'booking',
          'payment',
          'transaction',
          'review',
          'hotel',
          'room',
          'user',
          'refund'
        ),
        allowNull: true,
        comment: 'Type of related entity',
      },

      related_entity_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'ID of related entity (booking_id, transaction_id, etc.)',
      },

      // Action link
      action_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Deep link or URL for user to take action',
      },

      action_label: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Label for action button (e.g., "View Booking", "Reply")',
      },

      // Read status tracking
      is_read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether notification has been read',
      },

      read_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when notification was read',
      },

      // Delivery tracking
      is_sent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether notification was successfully sent via socket',
      },

      sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when notification was sent',
      },

      // Email/push notification tracking
      email_sent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether email notification was sent',
      },

      push_sent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether push notification was sent',
      },

      // Expiry
      expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Optional expiry date for time-sensitive notifications',
      },

      // Timestamps
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

      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Soft delete timestamp',
      },
    },
    {
      sequelize,
      tableName: 'notifications',
      timestamps: true,
      paranoid: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'receiver_id_idx',
          using: 'BTREE',
          fields: [{ name: 'receiver_id' }],
          comment: 'Fast lookup by receiver',
        },
        {
          name: 'receiver_unread_idx',
          using: 'BTREE',
          fields: [{ name: 'receiver_id' }, { name: 'is_read' }],
          comment: 'Optimized for unread notifications query',
        },
        {
          name: 'receiver_created_idx',
          using: 'BTREE',
          fields: [{ name: 'receiver_id' }, { name: 'created_at' }],
          comment: 'Optimized for chronological listing',
        },
        {
          name: 'type_category_idx',
          using: 'BTREE',
          fields: [{ name: 'notification_type' }, { name: 'category' }],
          comment: 'Filtering by type and category',
        },
        {
          name: 'related_entity_idx',
          using: 'BTREE',
          fields: [{ name: 'related_entity_type' }, { name: 'related_entity_id' }],
          comment: 'Find notifications for specific entities',
        },
        {
          name: 'expires_at_idx',
          using: 'BTREE',
          fields: [{ name: 'expires_at' }],
          comment: 'Cleanup expired notifications',
        },
        {
          name: 'sender_id_idx',
          using: 'BTREE',
          fields: [{ name: 'sender_id' }],
          comment: 'Lookup by sender',
        },
      ],
      hooks: {
        beforeUpdate: (notification) => {
          // Auto-set read_at when is_read changes to true
          if (notification.changed('is_read') && notification.is_read && !notification.read_at) {
            notification.read_at = new Date();
          }
        },
      },
    }
  );

  Notification.associate = function (models) {
    // Receiver association (user who receives the notification)
    Notification.belongsTo(models.users, {
      foreignKey: 'receiver_id',
      as: 'receiver',
    });

    // Sender association (user who triggered it, optional)
    Notification.belongsTo(models.users, {
      foreignKey: 'sender_id',
      as: 'sender',
    });

    // Note: Polymorphic associations for related entities should be handled
    // in application logic due to Sequelize limitations with true polymorphism
  };

  // Instance methods
  Notification.prototype.markAsRead = async function () {
    if (!this.is_read) {
      this.is_read = true;
      this.read_at = new Date();
      await this.save();
    }
    return this;
  };

  Notification.prototype.markAsSent = async function () {
    if (!this.is_sent) {
      this.is_sent = true;
      this.sent_at = new Date();
      await this.save();
    }
    return this;
  };

  Notification.prototype.isExpired = function () {
    return this.expires_at && new Date() > this.expires_at;
  };

  Notification.prototype.toPublicJSON = function () {
    const json = this.toJSON();
    // Remove sensitive internal fields
    delete json.email_sent;
    delete json.push_sent;
    delete json.is_sent;
    delete json.sent_at;
    delete json.deleted_at;
    return json;
  };

  // Class methods for common queries
  Notification.findUnreadByReceiver = async function (receiverId, options = {}) {
    return await this.findAll({
      where: {
        receiver_id: receiverId,
        is_read: false,
        ...(options.category && { category: options.category }),
      },
      order: [
        ['priority', 'DESC'],
        ['created_at', 'DESC'],
      ],
      limit: options.limit || 50,
    });
  };

  Notification.countUnreadByReceiver = async function (receiverId) {
    return await this.count({
      where: {
        receiver_id: receiverId,
        is_read: false,
      },
    });
  };

  Notification.markAllAsReadByReceiver = async function (receiverId) {
    return await this.update(
      {
        is_read: true,
        read_at: new Date(),
      },
      {
        where: {
          receiver_id: receiverId,
          is_read: false,
        },
      }
    );
  };

  Notification.deleteExpired = async function () {
    return await this.destroy({
      where: {
        expires_at: {
          [Sequelize.Op.lt]: new Date(),
        },
      },
      force: true,
    });
  };

  return Notification;
};
