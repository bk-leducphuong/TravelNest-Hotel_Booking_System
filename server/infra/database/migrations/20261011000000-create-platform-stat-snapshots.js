'use strict';

/**
 * Materialized platform KPIs for the superadmin monitoring console.
 *
 * The console previously computed platform-wide aggregates (per-status COUNTs
 * and per-currency SUMs) on every request. These two small tables hold a
 * precomputed snapshot instead, refreshed by a scheduled job
 * (`platformStatsRefresh` / `npm run stats:recompute`). The read path then
 * touches two tiny tables and never aggregates the primary data tables.
 *
 * `computed_at` records when the snapshot was produced, so the API can surface
 * its freshness.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('platform_status_counts', {
      metric: { type: Sequelize.STRING(32), allowNull: false, primaryKey: true },
      status: { type: Sequelize.STRING(32), allowNull: false, primaryKey: true },
      count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      computed_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('platform_finance_totals', {
      metric: { type: Sequelize.STRING(32), allowNull: false, primaryKey: true },
      currency: { type: Sequelize.STRING(3), allowNull: false, primaryKey: true },
      count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
      computed_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('platform_finance_totals');
    await queryInterface.dropTable('platform_status_counts');
  },
};
