const promotionDealsRepository = require('../infrastructure/promotion-deals.repository');

/**
 * Candidate hotels for the guest deals feed.
 *
 * The repository returns promotions ordered by headline discount (percentage
 * first, then fixed). A hotel may have several active offers, but the feed only
 * needs one row per hotel; the pricing pipeline later selects the actual best
 * offer for the requested stay.
 *
 * @param {{ limit?: number, now?: Date }} options
 * @returns {Promise<Array<object>>}
 */
async function listDealCandidates({ limit = 600, now = new Date() } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 600, 1), 600);
  const rows = await promotionDealsRepository.findDealCandidates({
    limit: Math.min(safeLimit * 4, 2000),
    now,
  });

  const seen = new Set();
  const candidates = [];

  for (const row of rows) {
    const hotelId = String(row.hotel_id);
    if (seen.has(hotelId)) continue;

    seen.add(hotelId);
    candidates.push(row);

    if (candidates.length >= safeLimit) break;
  }

  return candidates;
}

module.exports = { listDealCandidates };
