const ApiError = require('@utils/ApiError');
const { auditService } = require('@platform/audit');
const { eventBus, DOMAIN_EVENTS } = require('@platform/events');

const payoutRepository = require('../../infrastructure/payout.repository');
const payoutService = require('../payout.service');

/**
 * Execute a pending payout: creates the Stripe transfer to the connected
 * account, writes the ledger entry and notifies the owner (via payout.service).
 */
async function processPayout(payoutId, { actorUserId, requestId } = {}) {
  const payout = await payoutRepository.findById(payoutId);

  if (!payout) {
    throw new ApiError(404, 'PAYOUT_NOT_FOUND', 'Payout not found');
  }

  if (payout.status !== 'pending') {
    throw new ApiError(
      409,
      'PAYOUT_NOT_PROCESSABLE',
      `Only pending payouts can be processed (current status: ${payout.status})`
    );
  }

  try {
    const processed = await payoutService.processStripeTransfer(payoutId);

    await auditService.record({
      actorUserId,
      actorType: actorUserId ? 'user' : 'system',
      action: 'payout.processed',
      entityType: 'payout',
      entityId: payoutId,
      hotelId: payout.hotel_id,
      before: { status: 'pending' },
      after: { status: 'paid', providerTransferId: processed.provider_transfer_id },
      requestId,
    });

    await eventBus.publish(DOMAIN_EVENTS.PAYOUT_PAID, {
      payoutId,
      hotelId: payout.hotel_id,
      ownerId: payout.owner_id,
      amount: parseFloat(payout.amount),
      currency: payout.currency,
    });

    return processed;
  } catch (error) {
    await auditService.record({
      actorUserId,
      actorType: actorUserId ? 'user' : 'system',
      action: 'payout.failed',
      entityType: 'payout',
      entityId: payoutId,
      hotelId: payout.hotel_id,
      after: { status: 'failed', error: error.message },
      requestId,
    });

    await eventBus.publish(DOMAIN_EVENTS.PAYOUT_FAILED, {
      payoutId,
      hotelId: payout.hotel_id,
      ownerId: payout.owner_id,
      amount: parseFloat(payout.amount),
      currency: payout.currency,
      error: error.message,
    });

    throw new ApiError(502, 'PAYOUT_FAILED', error.message || 'Payout processing failed');
  }
}

module.exports = { processPayout };
