/**
 * Exact money helpers for promotions.
 *
 * All discount arithmetic happens in integer minor units (USD cents). DECIMAL
 * strings from MySQL are converted once at the boundary, never used in
 * intermediate math.
 */

const SCALE = 100;
const BASIS_POINTS = 10000;

function toMinor(value) {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * SCALE);
}

function fromMinor(value) {
  if (value === null || value === undefined) return null;
  return Number((Number(value) / SCALE).toFixed(2));
}

/** Percentage of an amount, rounded half-up to the nearest minor unit. */
function percentOfMinor(amountMinor, basisPoints) {
  const amount = Number(amountMinor) || 0;
  const points = Number(basisPoints) || 0;
  if (amount <= 0 || points <= 0) return 0;
  return Math.round((amount * points) / BASIS_POINTS);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Allocate `totalMinor` across `weights` (eligible line subtotals) so the
 * shares sum exactly to the total.
 *
 * Deterministic remainder rule: floor every proportional share, then hand out
 * the remaining minor units to the largest fractional remainders, breaking
 * ties by the lower index. Ineligible lines simply carry an explicit zero
 * weight.
 *
 * @param {number} totalMinor
 * @param {number[]} weights
 * @returns {number[]} allocation in the same order as the weights
 */
function allocateMinor(totalMinor, weights) {
  const total = Math.max(0, Math.round(Number(totalMinor) || 0));
  const safeWeights = (weights || []).map((weight) => Math.max(0, Math.round(Number(weight) || 0)));
  const weightSum = safeWeights.reduce((sum, weight) => sum + weight, 0);

  if (total === 0) return safeWeights.map(() => 0);
  if (weightSum === 0) {
    // No eligible weight: put the entire amount on the first line so callers
    // still receive an allocation that reconciles.
    return safeWeights.map((_, index) => (index === 0 ? total : 0));
  }

  const shares = safeWeights.map((weight) => (total * weight) / weightSum);
  const allocation = shares.map((share) => Math.floor(share));
  let remainder = total - allocation.reduce((sum, share) => sum + share, 0);

  const order = shares
    .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
    .filter((entry) => safeWeights[entry.index] > 0)
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (let index = 0; index < order.length && remainder > 0; index += 1) {
    allocation[order[index].index] += 1;
    remainder -= 1;
  }

  // The loop above can only leave a remainder when there are no eligible
  // weights, which is handled above. Guard anyway for defensive correctness.
  if (remainder > 0) allocation[allocation.length - 1] += remainder;

  return allocation;
}

module.exports = {
  SCALE,
  BASIS_POINTS,
  toMinor,
  fromMinor,
  percentOfMinor,
  clamp,
  allocateMinor,
};
