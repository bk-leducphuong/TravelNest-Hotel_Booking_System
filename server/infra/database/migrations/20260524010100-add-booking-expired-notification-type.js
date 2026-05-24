'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE notifications
      MODIFY notification_type ENUM(
        'booking_new',
        'booking_confirmed',
        'booking_cancelled',
        'booking_completed',
        'booking_status_update',
        'booking_expired',
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
      ) NOT NULL
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE notifications
      MODIFY notification_type ENUM(
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
      ) NOT NULL
    `);
  },
};
