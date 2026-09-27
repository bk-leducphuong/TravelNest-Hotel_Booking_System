'use strict';

const { addIndexIfMissing } = require('../migration-utils/schema');

/**
 * Global moderation queue sorts/filters by status + created_at, which the
 * existing idx_hotel_status index does not cover (it is hotel-scoped).
 */
module.exports = {
  up: async (queryInterface) => {
    await addIndexIfMissing(queryInterface, 'reviews', ['status', 'created_at'], {
      name: 'idx_reviews_status_created_at',
    });
  },

  down: async (queryInterface) => {
    const indexes = await queryInterface.showIndex('reviews');
    if (indexes.some((index) => index.name === 'idx_reviews_status_created_at')) {
      await queryInterface.removeIndex('reviews', 'idx_reviews_status_created_at');
    }
  },
};
