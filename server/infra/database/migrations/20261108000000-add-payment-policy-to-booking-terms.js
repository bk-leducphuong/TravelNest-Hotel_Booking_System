'use strict';

const { addColumnIfMissing, columnExists } = require('../migration-utils/schema');

/**
 * Add the booking payment condition (prepay vs. pay at property).
 *
 * `hotel_cancellation_rules` is the per-room/hotel-wide booking-terms table; the
 * payment condition lives alongside the cancellation terms so a room can be
 * booked without prepayment. `bookings.payment_policy` snapshots the resolved
 * value at booking time so later rule edits cannot rewrite history.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await addColumnIfMissing(queryInterface, 'hotel_cancellation_rules', 'payment_policy', {
      type: Sequelize.ENUM('prepay', 'pay_at_property'),
      allowNull: false,
      defaultValue: 'prepay',
      comment: 'Payment condition for this room/rate: prepay or pay at property',
    });

    await addColumnIfMissing(queryInterface, 'bookings', 'payment_policy', {
      type: Sequelize.ENUM('prepay', 'pay_at_property'),
      allowNull: false,
      defaultValue: 'prepay',
      comment: 'Payment condition snapshotted at booking time',
    });
  },

  down: async (queryInterface) => {
    if (await columnExists(queryInterface, 'bookings', 'payment_policy')) {
      await queryInterface.removeColumn('bookings', 'payment_policy');
    }
    if (await columnExists(queryInterface, 'hotel_cancellation_rules', 'payment_policy')) {
      await queryInterface.removeColumn('hotel_cancellation_rules', 'payment_policy');
    }
  },
};
