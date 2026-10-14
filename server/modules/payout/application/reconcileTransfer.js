const logger = require('@config/logger.config');

const payoutRepository = require('../infrastructure/payout.repository');
const { PAYOUT_STATUS } = require('../domain/payout-rules');

/**
 * Reconcile a Stripe Connect `transfer.*` event with the local payout row.
 *
 * `processStripeTransfer` already writes the transfer id and `paid` status on
 * success, so these events are a backstop: they recover when that write was
 * missed (request timed out) and catch reversals.
 */

// Transfer event → local payout status. `null` = leave the status alone.
const TRANSFER_EVENT_STATUS = {
  'transfer.created': PAYOUT_STATUS.PAID,
  'transfer.updated': null,
  'transfer.reversed': PAYOUT_STATUS.FAILED,
};

async function findPayoutForTransfer(transfer) {
  // Prefer the payout id we stamped into the transfer metadata; fall back to
  // the transfer id for transfers that predate the metadata.
  const payoutId = transfer?.metadata?.payout_id;
  if (payoutId) {
    const byId = await payoutRepository.findById(payoutId);
    if (byId) {
      return byId;
    }
  }

  if (transfer?.id) {
    return payoutRepository.findByProviderTransferId(transfer.id);
  }

  return null;
}

/**
 * @param {{ transfer: object, eventType: string }} params
 * @returns {Promise<object|null>} the updated payout, or null when unmatched.
 */
async function reconcileTransferFromStripe({ transfer, eventType } = {}) {
  if (!transfer?.id) {
    return null;
  }

  const payout = await findPayoutForTransfer(transfer);
  if (!payout) {
    logger.warn(
      { transferId: transfer.id, eventType },
      'Connect transfer event did not match a local payout'
    );
    return null;
  }

  const nextStatus = TRANSFER_EVENT_STATUS[eventType];
  const update = { providerTransferId: transfer.id };

  if (nextStatus === PAYOUT_STATUS.FAILED) {
    // A reversal is provider truth — the funds came back. Only our own
    // `cancelled` terminal state is left untouched.
    if (payout.status !== PAYOUT_STATUS.CANCELLED) {
      update.status = PAYOUT_STATUS.FAILED;
    }
  } else if (nextStatus === PAYOUT_STATUS.PAID && payout.status !== PAYOUT_STATUS.PAID) {
    // Backstop for a lost `transfers.create` response.
    update.status = PAYOUT_STATUS.PAID;
    update.paidAt = new Date();
  }

  await payoutRepository.update(payout.id, update);

  logger.info(
    {
      payoutId: payout.id,
      transferId: transfer.id,
      eventType,
      status: update.status || payout.status,
    },
    'Reconciled Connect transfer event onto payout'
  );

  return payoutRepository.findById(payout.id);
}

module.exports = { reconcileTransferFromStripe, TRANSFER_EVENT_STATUS };
