/**
 * Migration: Improve notifications table
 * - Drop old notifications table (no data to preserve)
 * - Create new notifications table with improved schema
 * - receiver_id now references users instead of hotels
 * - notification_type as ENUM with predefined types
 * - Added category, priority, title fields
 * - Added metadata JSON field for rich notifications
 * - Added polymorphic association fields (related_entity_type, related_entity_id)
 * - Added action_url and action_label for actionable notifications
 * - Added read_at timestamp
 * - Added delivery tracking fields (is_sent, sent_at, email_sent, push_sent)
 * - Added expires_at for time-sensitive notifications
 * - Added soft delete support (deleted_at)
 * - Added updated_at timestamp
 * - Added optimized indexes
 * - sender_id is nullable for system notifications
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Drop old notifications table
      await queryInterface.dropTable('notifications', { transaction });

      // Create new notifications table with improved schema
      await queryInterface.createTable(
        'notifications',
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
          },
          receiver_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            comment: 'User receiving the notification (customer or hotel owner)',
          },
          sender_id: {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id',
            },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
            comment: 'User who triggered the notification (null for system notifications)',
          },
          notification_type: {
            type: Sequelize.ENUM(
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
          category: {
            type: Sequelize.ENUM('booking', 'payment', 'review', 'message', 'system', 'marketing'),
            allowNull: false,
            defaultValue: 'system',
            comment: 'High-level category for UI grouping',
          },
          priority: {
            type: Sequelize.ENUM('low', 'normal', 'high', 'urgent'),
            allowNull: false,
            defaultValue: 'normal',
            comment: 'Priority level affects display order and UI treatment',
          },
          title: {
            type: Sequelize.STRING(255),
            allowNull: false,
            comment: 'Short notification title/subject',
          },
          message: {
            type: Sequelize.TEXT,
            allowNull: false,
            comment: 'Full notification message body',
          },
          metadata: {
            type: Sequelize.JSON,
            allowNull: true,
            comment: 'Additional data: booking_id, amount, dates, etc.',
          },
          related_entity_type: {
            type: Sequelize.ENUM(
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
            type: Sequelize.UUID,
            allowNull: true,
            comment: 'ID of related entity (booking_id, transaction_id, etc.)',
          },
          action_url: {
            type: Sequelize.STRING(500),
            allowNull: true,
            comment: 'Deep link or URL for user to take action',
          },
          action_label: {
            type: Sequelize.STRING(100),
            allowNull: true,
            comment: 'Label for action button (e.g., "View Booking", "Reply")',
          },
          is_read: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Whether notification has been read',
          },
          read_at: {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Timestamp when notification was read',
          },
          is_sent: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Whether notification was successfully sent via socket',
          },
          sent_at: {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Timestamp when notification was sent',
          },
          email_sent: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Whether email notification was sent',
          },
          push_sent: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Whether push notification was sent',
          },
          expires_at: {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Optional expiry date for time-sensitive notifications',
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
          },
          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Soft delete timestamp',
          },
        },
        { transaction }
      );

      // Create optimized indexes
      await queryInterface.addIndex('notifications', ['receiver_id'], {
        name: 'receiver_id_idx',
        transaction,
      });

      await queryInterface.addIndex('notifications', ['receiver_id', 'is_read'], {
        name: 'receiver_unread_idx',
        transaction,
      });

      await queryInterface.addIndex('notifications', ['receiver_id', 'created_at'], {
        name: 'receiver_created_idx',
        transaction,
      });

      await queryInterface.addIndex('notifications', ['notification_type', 'category'], {
        name: 'type_category_idx',
        transaction,
      });

      await queryInterface.addIndex('notifications', ['related_entity_type', 'related_entity_id'], {
        name: 'related_entity_idx',
        transaction,
      });

      await queryInterface.addIndex('notifications', ['expires_at'], {
        name: 'expires_at_idx',
        transaction,
      });

      await queryInterface.addIndex('notifications', ['sender_id'], {
        name: 'sender_id_idx',
        transaction,
      });

      await transaction.commit();
      console.log('✅ Notifications table recreated successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Drop the new notifications table
      await queryInterface.dropTable('notifications', { transaction });

      // Recreate old notifications table structure
      await queryInterface.createTable(
        'notifications',
        {
          id: {
            type: Sequelize.UUID,
            allowNull: false,
            primaryKey: true,
          },
          sender_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
          },
          notification_type: {
            type: Sequelize.STRING(50),
            allowNull: true,
          },
          message: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: true,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          is_read: {
            type: Sequelize.BOOLEAN,
            allowNull: true,
          },
          reciever_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'hotels',
              key: 'id',
            },
          },
        },
        { transaction }
      );

      // Recreate old indexes
      await queryInterface.addIndex('notifications', ['reciever_id'], {
        name: 'notifications_ibfk_1_idx',
        transaction,
      });

      await queryInterface.addIndex('notifications', ['sender_id'], {
        name: 'sender_id_idx',
        transaction,
      });

      await transaction.commit();
      console.log('✅ Rolled back to old notifications table structure');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  },
};
