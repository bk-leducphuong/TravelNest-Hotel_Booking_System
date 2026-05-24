'use strict';

const CURRENCY_COLUMNS = [
  ['bookings', 'currency'],
  ['holds', 'currency'],
  ['transactions', 'currency'],
  ['payments', 'currency'],
  ['invoices', 'currency'],
  ['room_inventories', 'currency'],
  ['refunds', 'currency'],
  ['payouts', 'currency'],
  ['payout_items', 'currency'],
  ['ledger_accounts', 'currency'],
  ['ledger_entries', 'currency'],
  ['connected_payment_accounts', 'default_currency'],
];

module.exports = {
  up: async (queryInterface) => {
    for (const [tableName, columnName] of CURRENCY_COLUMNS) {
      const table = await queryInterface
        .describeTable(tableName)
        .catch(() => null);

      if (table?.[columnName]) {
        await queryInterface.bulkUpdate(tableName, { [columnName]: 'USD' }, {});
      }
    }
  },

  down: async () => {},
};
