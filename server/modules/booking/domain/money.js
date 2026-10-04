/**
 * Money helpers for booking amounts.
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
 * Convert a major-unit amount to the currency's minor units (e.g. cents).
 */
function toMinorUnits(amount, currency) {
  const parsed = parseFloat(amount || 0);
  const factor = ZERO_DECIMAL_CURRENCIES.has(String(currency).toUpperCase()) ? 1 : 100;

  return Math.round(parsed * factor);
}

module.exports = { toMinorUnits };
