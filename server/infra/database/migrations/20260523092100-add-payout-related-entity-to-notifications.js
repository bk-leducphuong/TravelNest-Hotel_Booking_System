'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('notifications', 'related_entity_type', {
      type: Sequelize.ENUM(
        'booking',
        'payment',
        'transaction',
        'review',
        'hotel',
        'room',
        'user',
        'refund',
        'payout'
      ),
      allowNull: true,
      comment: 'Type of related entity',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('notifications', 'related_entity_type', {
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
    });
  },
};
