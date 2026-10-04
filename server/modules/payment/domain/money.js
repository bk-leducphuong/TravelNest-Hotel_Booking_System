/**
 * Payment money conversions (pure).
 *
 * NOTE: `toMinorUnits` and `fromMinorUnits` intentionally mirror the legacy
 * service's (asymmetric) behaviour — `toMinorUnits` only treats USD as a
 * two-decimal currency. Do not "fix" this here without a migration plan; the
 * amounts already written to the ledger depend on it.
 */

const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

/**
 * Convert minor units (e.g. cents) to a major-unit amount.
 */
function fromMinorUnits(amount, currency) {
  const normalizedCurrency = String(currency || 'USD').toUpperCase();
  const parsed = parseFloat(amount || 0);

  return (
    Math.round((parsed / (ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency) ? 1 : 100)) * 100) / 100
  );
}

/**
 * Convert a major-unit amount to minor units.
 */
function toMinorUnits(amount, currency) {
  const normalizedCurrency = String(currency || 'USD').toUpperCase();
  const parsed = parseFloat(amount || 0);

  return Math.round(parsed * (normalizedCurrency === 'USD' ? 100 : 1));
}

module.exports = { fromMinorUnits, toMinorUnits };
