const logger = require('@config/logger.config');

const sequelize = require('@config/database.config');
const promotionRepository = require('../infrastructure/promotion.repository');
const { redeemPromotion, releasePromotionInTransaction } = require('./lifecycle');

const PAID_STATUSES = new Set(['confirmed', 'checked_in', 'completed']);
const TERMINAL_UNPAID_STATUSES = new Set(['cancelled', 'expired', 'no_show']);

/**
 * Repair promotion reservations that missed their booking/payment transition.
 *
 * Reservation rows are never released merely because a timestamp passed: the
 * booking's own state is read through the booking module's public interface
 * first. Pending bookings stay reserved for the normal booking expiry flow.
 */
async function reconcilePromotionReservations({ limit = 100, now = new Date() } = {}) {
  const bookings = require('@modules/booking');
  const overdue = await promotionRepository.findOverdueReservations(now, { limit });

  const summary = { processed: overdue.length, redeemed: 0, released: 0, skipped: 0, failed: 0 };

  for (const redemption of overdue) {
    try {
      const booking = await bookings.getBookingForPayment(redemption.booking_id);
      if (!booking) {
        summary.skipped += 1;
        continue;
      }

      const status = booking.status;
      if (PAID_STATUSES.has(status)) {
        const transaction = await sequelize.transaction();
        try {
          await redeemPromotion(redemption.booking_id, { transaction });
          await transaction.commit();
          summary.redeemed += 1;
        } catch (error) {
          if (!transaction.finished) await transaction.rollback();
          throw error;
        }
        continue;
      }

      if (TERMINAL_UNPAID_STATUSES.has(status)) {
        const transaction = await sequelize.transaction();
        try {
          await releasePromotionInTransaction(redemption.booking_id, {
            reason: 'reconciliation_terminal_booking',
            transaction,
          });
          await transaction.commit();
          summary.released += 1;
        } catch (error) {
          if (!transaction.finished) await transaction.rollback();
          throw error;
        }
        continue;
      }

      // pending/pending_payment: the booking expiry worker owns the terminal
      // transition and releases promotion capacity there.
      summary.skipped += 1;
    } catch (error) {
      summary.failed += 1;
      logger.error(
        { redemptionId: redemption.id, bookingId: redemption.booking_id, error: error.message },
        'Promotion reconciliation failed for reservation'
      );
    }
  }

  return summary;
}

module.exports = { reconcilePromotionReservations };
