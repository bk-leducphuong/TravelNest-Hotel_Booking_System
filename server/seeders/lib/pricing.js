/**
 * Pricing math shared with the application.
 *
 * Mirrors `services/pricing.service.js` exactly so seeded booking breakdowns
 * match what the app would compute at checkout:
 *
 *   taxAmount               = round(subtotal * taxRate)
 *   serviceFeeAmount        = round(subtotal * serviceFeeRate)
 *   platformCommissionAmount= round(subtotal * platformCommissionRate)
 *   totalPrice              = round(subtotal + taxAmount + serviceFeeAmount)
 *
 * Rates come from the same env vars the service reads, so a developer who sets
 * `BOOKING_TAX_RATE=10` in `.env.development` gets seeded tax too. All default
 * to 0, matching the current config.
 */

const ENV_KEYS = {
  tax: 'BOOKING_TAX_RATE',
  serviceFee: 'BOOKING_SERVICE_FEE_RATE',
  platformFee: 'PLATFORM_FEE_RATE',
};

const CURRENCY = 'USD';

/**
 * Percentages above 1 are treated as percent (`10` -> `0.1`); anything <= 0 is 0.
 * Identical to `PricingService.normalizeRate`.
 */
function normalizeRate(value) {
  const parsed = parseFloat(value || 0);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed > 1 ? parsed / 100 : parsed;
}

/**
 * Round to 2 decimals. Identical to `PricingService.roundMoney`.
 */
function roundMoney(value) {
  return Math.round(parseFloat(value || 0) * 100) / 100;
}

/**
 * Resolve the configured rates once per process.
 */
function rates(env = process.env) {
  return {
    taxRate: normalizeRate(env[ENV_KEYS.tax]),
    serviceFeeRate: normalizeRate(env[ENV_KEYS.serviceFee]),
    platformCommissionRate: normalizeRate(env[ENV_KEYS.platformFee]),
  };
}

/**
 * Build the per-night price list for one room.
 *
 * Returns `{ nightly, subtotal }` where `nightly` entries are
 * `{ date, price, quantity, total }` — the same shape the app stores in
 * `booking_rooms.nightly_price_snapshot` — and `subtotal` is their summed
 * `total`, so the breakdown is internally consistent by construction.
 *
 * @param {Object} options
 * @param {Date} options.checkIn - first night
 * @param {number} options.nights - number of nights
 * @param {number} options.quantity - rooms booked
 * @param {(night: number) => number} options.priceForNight - nightly price
 */
function buildNightly({ checkIn, nights, quantity, priceForNight }) {
  const nightly = [];

  for (let night = 0; night < nights; night += 1) {
    const date = new Date(checkIn);
    date.setUTCDate(date.getUTCDate() + night);

    const price = roundMoney(priceForNight(night));
    nightly.push({
      date: date.toISOString().slice(0, 10),
      price,
      quantity,
      total: roundMoney(price * quantity),
    });
  }

  const subtotal = roundMoney(nightly.reduce((sum, night) => sum + night.total, 0));
  return { nightly, subtotal };
}

/**
 * Derive tax / fee / commission / total from a subtotal.
 */
function breakdownFrom(subtotal, rateSet = rates()) {
  const taxAmount = roundMoney(subtotal * rateSet.taxRate);
  const serviceFeeAmount = roundMoney(subtotal * rateSet.serviceFeeRate);
  const platformCommissionAmount = roundMoney(subtotal * rateSet.platformCommissionRate);

  return {
    subtotal,
    taxAmount,
    serviceFeeAmount,
    platformCommissionAmount,
    totalPrice: roundMoney(subtotal + taxAmount + serviceFeeAmount),
    currency: CURRENCY,
    ...rateSet,
  };
}

module.exports = {
  CURRENCY,
  ENV_KEYS,
  breakdownFrom,
  buildNightly,
  normalizeRate,
  rates,
  roundMoney,
};
