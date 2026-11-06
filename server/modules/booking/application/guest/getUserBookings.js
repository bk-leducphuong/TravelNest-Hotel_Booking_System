const bookingRepository = require('../../infrastructure/booking.repository');
const { paymentModule } = require('../../infrastructure/payment.client');

const { formatHotelForLegacyClients, formatRoom } = require('./formatters');

const BOOKING_VIEWS = ['active', 'cancelled', 'all'];

/**
 * Resolve the requested history view. `status` is the explicit API contract;
 * `includeCancelled` remains supported for older clients.
 */
function resolveView({ status, includeCancelled = false } = {}) {
  if (BOOKING_VIEWS.includes(status)) return status;
  return includeCancelled ? 'all' : 'active';
}

/**
 * Load refund summaries for the cancellation decisions on this page in one
 * query. Only cancelled bookings have a cancellation decision.
 */
async function refundSummariesByBooking(bookings) {
  const refundIds = bookings
    .filter((booking) => booking.status === 'cancelled')
    .map((booking) => booking.cancellation_decision?.refundId)
    .filter(Boolean);

  if (!refundIds.length) return new Map();

  const summaries = await paymentModule().getCancellationRefundSummaries(refundIds);
  return new Map(summaries.filter(Boolean).map((summary) => [summary.refundId, summary]));
}

/**
 * Guest-facing cancellation summary attached to a cancelled booking. A legacy
 * cancellation without a stored decision is treated as needing review, matching
 * the refund-status endpoint.
 */
function cancellationSummary(booking, refundsById) {
  const decision = booking.cancellation_decision || null;
  const refundId = decision?.refundId || null;

  return {
    outcome: decision?.outcome || 'manual_review',
    decidedAt: decision?.decidedAt || booking.cancelled_at || null,
    refund: refundId ? refundsById.get(refundId) || null : null,
  };
}

/**
 * Get a page of bookings for a user, refreshing statuses from the current date
 * first and enriching each row with its hotel, room and (when cancelled) the
 * durable refund decision/state.
 *
 * @param {number} userId
 * @param {{
 *   includeCancelled?: boolean,
 *   status?: 'active'|'cancelled'|'all',
 *   reviewed?: boolean,
 *   bookedAfter?: Date|string,
 *   page?: number,
 *   limit?: number,
 * }} options
 *   `status` selects the history view. `includeCancelled` is the legacy alias:
 *   true maps to `all`, false to `active`. `reviewed` optionally filters by
 *   review state (true = only reviewed, false = only unreviewed). `bookedAfter`
 *   is a rolling-window filter on the booking's `created_at`. When `limit` is
 *   provided the result is paginated.
 * @returns {Promise<{ bookings: Array<object>, page: number, limit: number, total: number }>}
 */
async function getUserBookings(userId, options = {}) {
  const { includeCancelled = false, status, reviewed, bookedAfter, page, limit } = options;

  const parsedLimit = Number(limit);
  const paginated = Number.isFinite(parsedLimit) && parsedLimit > 0;
  const safeLimit = paginated ? Math.min(Math.floor(parsedLimit), 100) : undefined;
  const parsedPage = Number(page);
  const safePage = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;

  const view = resolveView({ status, includeCancelled });
  const filters = {
    status: view,
    reviewed,
    bookedAfter,
  };

  const queryOptions = { ...filters };
  if (paginated) {
    queryOptions.limit = safeLimit;
    queryOptions.offset = (safePage - 1) * safeLimit;
  }

  // Update booking statuses based on current date
  await bookingRepository.updateStatusByDates(userId);

  // Get the page of bookings and the total for that same filter set
  const [bookings, total] = await Promise.all([
    bookingRepository.findByBuyerId(userId, queryOptions),
    bookingRepository.countByBuyerId(userId, filters),
  ]);

  const rows = bookings.map((booking) => (booking.toJSON ? booking.toJSON() : booking));
  const refundsById = await refundSummariesByBooking(rows);

  // Enrich with hotel, room and refund-tracking information
  const enriched = await Promise.all(
    rows.map(async (bookingData) => {
      const hotel = await bookingRepository.findHotelById(bookingData.hotel_id);
      const room = await bookingRepository.findRoomById(bookingData.room_id);

      return {
        ...bookingData,
        hotel: formatHotelForLegacyClients(hotel),
        room: formatRoom(room),
        ...(bookingData.status === 'cancelled'
          ? { cancellation: cancellationSummary(bookingData, refundsById) }
          : {}),
      };
    })
  );

  return {
    bookings: enriched,
    page: safePage,
    limit: safeLimit ?? total,
    total,
  };
}

module.exports = { getUserBookings, resolveView };
