'use strict';

const {
  backfillConversations,
} = require('../../../modules/messaging/application/backfillConversations');

/**
 * Create messaging threads for bookings that existed before the feature shipped.
 *
 * Conservative on purpose: only active/future stays (`confirmed`, `checked_in`,
 * check-out today or later). Historical/cancelled stays keep working lazily via
 * `POST /conversations`; an operator can widen the scope with
 * `yarn workspace @travelnest/server messaging:backfill --since=… --statuses=…`.
 *
 * The backfill is idempotent (`INSERT IGNORE` + unique `booking_id`) and batches
 * its reads/writes, so re-running or interrupting it is safe. `down` is a no-op:
 * deleting threads here could remove real conversations created after deploy.
 */
module.exports = {
  async up(queryInterface) {
    const result = await backfillConversations({
      sequelize: queryInterface.sequelize,
      batchSize: 500,
    });

    console.log(
      `[messaging] backfilled ${result.created} conversation(s) across ${result.scanned} booking(s)`
    );
  },

  async down() {
    // Intentionally irreversible: see the note above.
  },
};
