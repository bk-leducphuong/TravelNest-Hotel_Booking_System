'use strict';

const { dropIndexIfExists } = require('../migration-utils/schema');

/**
 * Remove redundant duplicate indexes.
 *
 * Historically, models declared uniqueness twice (attribute-level `unique: true`
 * AND an explicit unique index) and `sequelize.sync()` re-applied the attribute
 * `UNIQUE` during its column-reconcile pass. The result was 2-3 identical unique
 * indexes on the same columns (e.g. `name`, `name_2`, `unique_role_name`), which
 * waste storage and slow writes. Through-tables (`belongsToMany`) had the same
 * problem: Sequelize's implicit composite unique index plus the model's explicit
 * one.
 *
 * The models have been fixed, so a fresh database (baseline migration) is clean.
 * This migration brings existing databases in line by dropping the redundant
 * indexes. It keeps the model-declared index in every case and is idempotent
 * (missing indexes are skipped).
 */

// table -> redundant index names to drop (the model-declared index is kept)
const REDUNDANT_INDEXES = {
  amenities: ['code', 'code_2'],
  bookings: ['booking_code', 'booking_code_2'],
  cities: ['slug', 'slug_2'],
  countries: ['name', 'name_2', 'iso_code', 'iso_code_2'],
  destinations: ['slug', 'slug_2'],
  hotel_amenities: ['hotel_amenities_hotel_id_amenity_id_unique'],
  invoices: ['invoice_number', 'invoice_number_2'],
  ledger_accounts: ['account_key', 'account_key_2'],
  ledger_entries: ['idempotency_key', 'idempotency_key_2'],
  nearby_places: ['google_place_id', 'google_place_id_2'],
  payouts: [
    'provider_payout_id',
    'provider_payout_id_2',
    'provider_transfer_id',
    'provider_transfer_id_2',
  ],
  permissions: ['name', 'name_2'],
  refunds: ['provider_refund_id', 'provider_refund_id_2'],
  review_replies: ['review_id'],
  role_permissions: ['role_permissions_role_id_permission_id_unique'],
  roles: ['name', 'name_2'],
  room_amenities: ['room_amenities_room_id_amenity_id_unique'],
  transactions: ['stripe_payment_intent_id_2'],
  webhook_event_logs: ['event_id', 'event_id_2'],
};

module.exports = {
  async up(queryInterface) {
    for (const [table, indexes] of Object.entries(REDUNDANT_INDEXES)) {
      for (const index of indexes) {
        await dropIndexIfExists(queryInterface, table, index);
      }
    }
  },

  async down() {
    // Intentionally a no-op: recreating redundant duplicate indexes is not
    // desirable. The canonical index for each column set is declared by the
    // model and recreated by the baseline migration.
  },
};
