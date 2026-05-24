const LEDGER_ACCOUNT_TYPES = [
  'platform_cash',
  'platform_revenue',
  'customer_receivable',
  'hotel_owner_payable',
  'refund_liability',
  'payment_provider_clearing',
];

const LEDGER_OWNER_TYPES = ['platform', 'user', 'hotel', 'provider'];

const LEDGER_ENTRY_DIRECTIONS = ['debit', 'credit'];

const LEDGER_EVENT_TYPES = [
  'payment_succeeded',
  'refund_succeeded',
  'payout_created',
  'payout_paid',
  'payout_failed',
  'platform_fee_recognized',
  'manual_adjustment',
];

module.exports = {
  LEDGER_ACCOUNT_TYPES,
  LEDGER_OWNER_TYPES,
  LEDGER_ENTRY_DIRECTIONS,
  LEDGER_EVENT_TYPES,
};
