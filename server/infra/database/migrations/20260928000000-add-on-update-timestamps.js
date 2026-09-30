'use strict';

/**
 * Make `updated_at` self-maintaining for tables whose models use
 * `timestamps: false`.
 *
 * Those models declare `updated_at` with `DEFAULT CURRENT_TIMESTAMP`, which only
 * fires on INSERT. Sequelize does not touch the column on update (timestamps are
 * disabled), so `updated_at` went stale. Adding `ON UPDATE CURRENT_TIMESTAMP`
 * makes the database maintain it for every writer (Sequelize, raw SQL, and the Go
 * services).
 *
 * The models now declare the same clause, so the baseline and a fresh database
 * already have it; this migration updates existing databases. Idempotent.
 */

// table -> nullability of updated_at in the model
const TABLES = {
  bookings: 'NOT NULL',
  booking_rooms: 'NOT NULL',
  holds: 'NOT NULL',
  hotel_cancellation_rules: 'NOT NULL',
  idempotency_keys: 'NOT NULL',
  images: '', // images.updated_at is nullable in the model
  invoices: 'NOT NULL',
  ledger_accounts: 'NOT NULL',
  payments: 'NOT NULL',
  payouts: 'NOT NULL',
  payout_items: 'NOT NULL',
  refunds: 'NOT NULL',
  transactions: 'NOT NULL',
};

module.exports = {
  async up(queryInterface) {
    for (const [table, nullability] of Object.entries(TABLES)) {
      await queryInterface.sequelize.query(
        `ALTER TABLE \`${table}\` MODIFY \`updated_at\` DATETIME ${nullability} DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
      );
    }
  },

  async down(queryInterface) {
    for (const [table, nullability] of Object.entries(TABLES)) {
      await queryInterface.sequelize.query(
        `ALTER TABLE \`${table}\` MODIFY \`updated_at\` DATETIME ${nullability} DEFAULT CURRENT_TIMESTAMP`
      );
    }
  },
};
