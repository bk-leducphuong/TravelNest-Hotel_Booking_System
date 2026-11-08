'use strict';

const { addIndexIfMissing, dropIndexIfExists } = require('../migration-utils/schema');

/**
 * Align the promotion indexes created by the migrations with the ones
 * `sequelize.sync()` derives from the models.
 *
 * `created_by` / `updated_by` are `belongsTo(users)` associations, so Sequelize's
 * sync-created schema carries an index for each of them; the migration-created
 * schema did not, which tripped the "Schema Drift (migrations vs models)" gate.
 */
module.exports = {
  up: async (queryInterface) => {
    await addIndexIfMissing(queryInterface, 'promotions', ['created_by'], {
      name: 'promotions_created_by',
    });
    await addIndexIfMissing(queryInterface, 'promotions', ['updated_by'], {
      name: 'promotions_updated_by',
    });
  },

  down: async (queryInterface) => {
    await dropIndexIfExists(queryInterface, 'promotions', 'promotions_updated_by');
    await dropIndexIfExists(queryInterface, 'promotions', 'promotions_created_by');
  },
};
