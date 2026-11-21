const sequelize = require('@config/database.config');
const logger = require('@config/logger.config');
const notificationModule = require('@modules/notification');
const paymentModule = require('@modules/payment');
const ApiError = require('@utils/ApiError');

const { settleTransfer } = require('./settleTransfer');

const payoutRepository = require('../infrastructure/payout.repository');
const { getStripe, isStripeConfigured } = require('../infrastructure/stripe-client');

/**
 * Stripe transfer lifecycle for payouts: claim, execute, resume, settle and
 * failure classification. Kept separate from payout generation so neither
 * concern grows into a god file.
 */
class PayoutTransferService {
  async processStripeTransfer(payoutId) {
    const { payout, providerAccountId } = await this.claimPayoutForTransfer(payoutId);
    return await this.executeTransfer(payout, providerAccountId);
  }

  /**
   * Atomically move a pending payout to `processing` after re-checking the
   * hotel balance. The row lock and status check make double processing
   * impossible even when two workers pick up the same payout.
   */
  async claimPayoutForTransfer(payoutId) {
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

    const providerAccountId = payout.connected_payment_account?.provider_account_id;
    if (!providerAccountId) {
      throw new ApiError(
        409,
        'PAYOUT_ACCOUNT_NOT_READY',
        'Payout connected account is missing provider account ID'
      );
    }

    if (!isStripeConfigured()) {
      throw new ApiError(
        503,
        'STRIPE_NOT_CONFIGURED',
        'Stripe is not configured. Payout operations are unavailable.'
      );
    }

    await sequelize.transaction(async (transaction) => {
      const options = { transaction };
      await paymentModule.lockHotelBalance(payout.hotel_id, payout.currency, options);
      const current = await payoutRepository.findForClaim(payout.id, {
        ...options,
        lock: transaction.LOCK.UPDATE,
      });
      if (!current || current.status !== 'pending') {
        throw new ApiError(409, 'PAYOUT_ALREADY_CLAIMED', 'Payout already claimed');
      }
      const available = await paymentModule.availableHotelBalance(
        payout.hotel_id,
        payout.currency,
        options
      );
      const reserved = await payoutRepository.sumReserved(
        payout.hotel_id,
        payout.currency,
        payout.id,
        options
      );
      if (Number(payout.amount) > available - reserved + 0.001) {
        throw new ApiError(
          409,
          'PAYOUT_BALANCE_RESERVED',
          'Refund obligations or owner debt must be settled before this payout'
        );
      }
      await payoutRepository.update(payout.id, { status: 'processing' }, options);
    });

    return {
      payout: await payoutRepository.findById(payout.id),
      providerAccountId,
    };
  }

  /**
   * Re-drive a payout stuck in `processing` because the transfer response was
   * lost. The original idempotency key is reused, so Stripe either returns the
   * existing transfer or creates it exactly once.
   */
  async resumeStripeTransfer(payoutId) {
    const payout = await payoutRepository.findById(payoutId);

    if (!payout) {
      throw new ApiError(404, 'PAYOUT_NOT_FOUND', 'Payout not found');
    }

    if (payout.status === 'paid') {
      return payout;
    }

    if (payout.status !== 'processing') {
      throw new ApiError(
        409,
        'PAYOUT_NOT_PROCESSABLE',
        `Only processing payouts can be resumed (current status: ${payout.status})`
      );
    }

    if (!isStripeConfigured()) {
      throw new ApiError(
        503,
        'STRIPE_NOT_CONFIGURED',
        'Stripe is not configured. Payout operations are unavailable.'
      );
    }

    const providerAccountId = payout.connected_payment_account?.provider_account_id;
    if (!providerAccountId) {
      throw new ApiError(
        409,
        'PAYOUT_ACCOUNT_NOT_READY',
        'Payout connected account is missing provider account ID'
      );
    }

    if (payout.provider_transfer_id) {
      const stripe = getStripe();
      let transfer;
      try {
        transfer = await stripe.transfers.retrieve(payout.provider_transfer_id);
      } catch (error) {
        if (error.statusCode === 404) {
          await payoutRepository.update(payout.id, {
            status: 'failed',
            failureCode: 'provider_transfer_missing',
            failureMessage: error.message,
          });
          throw new ApiError(
            502,
            'PAYOUT_FAILED',
            'Provider transfer could not be found; manual reconciliation required'
          );
        }
        throw error;
      }

      if (transfer.reversed) {
        await payoutRepository.update(payout.id, {
          status: 'failed',
          failureCode: 'transfer_reversed',
          failureMessage: 'Provider reversed the transfer',
        });
        throw new ApiError(502, 'PAYOUT_FAILED', 'Provider reversed the transfer');
      }

      try {
        await settleTransfer(payout, transfer);
      } catch (error) {
        // The transfer exists but our ledger write did not commit. Keep the
        // payout reserved/processing so recovery can retry the posting without
        // risking a second transfer.
        await payoutRepository.update(payout.id, {
          status: 'processing',
          failureCode: 'transfer_reconciliation_failed',
          failureMessage: error.message,
        });
        throw new ApiError(502, 'PAYOUT_SETTLEMENT_FAILED', error.message);
      }
      return await payoutRepository.findById(payout.id);
    }

    return await this.executeTransfer(payout, providerAccountId, { notify: false });
  }

  async executeTransfer(payout, providerAccountId, { notify = true } = {}) {
    const stripe = getStripe();
    let transfer;

    try {
      transfer = await stripe.transfers.create(
        {
          amount: this.toMinorUnits(payout.amount),
          currency: payout.currency.toLowerCase(),
          destination: providerAccountId,
          metadata: {
            payout_id: payout.id,
            hotel_id: payout.hotel_id,
            owner_id: payout.owner_id,
            transaction_id: payout.transaction_id || '',
          },
        },
        { idempotencyKey: `payout-${payout.id}`, timeout: 30000, maxNetworkRetries: 0 }
      );
    } catch (error) {
      return await this.failTransfer(payout, error, { notify });
    }

    try {
      await settleTransfer(payout, transfer);
    } catch (error) {
      logger.error(
        { payoutId: payout.id, error: error.message },
        'Payout transfer settlement failed'
      );
      // Keep the row claimed and reserved; recovery retries the ledger posting
      // with the same transfer idempotency key instead of paying again.
      await payoutRepository.update(payout.id, {
        status: 'processing',
        failureCode: 'ledger_settlement_failed',
        failureMessage: error.message,
      });
      throw new ApiError(502, 'PAYOUT_SETTLEMENT_FAILED', error.message);
    }

    if (notify) {
      await this.notify(payout, 'completed');
    }

    return await payoutRepository.findById(payout.id);
  }

  async failTransfer(payout, error, { notify = true } = {}) {
    // The webhook may have settled the payout while the API call was timing
    // out. Never regress a terminal state written by the reconciliation path.
    const current = await payoutRepository.findById(payout.id);
    if (current && ['paid', 'cancelled'].includes(current.status)) {
      logger.warn(
        { payoutId: payout.id, status: current.status, error: error.message },
        'Transfer failed after payout was already settled by reconciliation'
      );
      return current;
    }

    const definitive = this.isDefinitiveTransferError(error);
    const failureCode = error.code || error.type || 'stripe_transfer_outcome_unknown';

    logger.error(
      { payoutId: payout.id, definitive, failureCode, error: error.message },
      'Stripe transfer failed for payout'
    );

    await payoutRepository.update(payout.id, {
      status: definitive ? 'failed' : 'processing',
      failureCode,
      failureMessage: error.message,
    });

    // A non-definitive outcome may still succeed; the recovery job reconciles
    // it through the transfer webhook / provider lookup. Only alert the owner
    // when we know the transfer failed.
    if (definitive && notify) {
      await this.notify(payout, 'failed', error.message);
    }

    throw new ApiError(
      definitive ? 502 : 503,
      definitive ? 'PAYOUT_FAILED' : 'PAYOUT_OUTCOME_UNKNOWN',
      error.message || 'Payout transfer failed'
    );
  }

  async notify(payout, status, reason) {
    try {
      await notificationModule.sendPayoutNotification({
        hotelId: payout.hotel_id,
        ownerId: payout.owner_id,
        payoutId: payout.id,
        status,
        amount: payout.amount,
        currency: payout.currency,
        reason,
      });
    } catch (error) {
      logger.error(
        { payoutId: payout.id, error: error.message },
        'Payout status notification failed'
      );
    }
  }

  /**
   * Stripe errors are split into definitive rejections (retrying is pointless)
   * and unknown/transient failures (the transfer may have succeeded, so the
   * payout stays `processing` and is reconciled later).
   */
  isDefinitiveTransferError(error) {
    if (!error) return false;

    const type = error.type || error.name;
    if (['StripeConnectionError', 'StripeAPIError', 'StripeRateLimitError'].includes(type)) {
      return false;
    }
    if (['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN'].includes(error.code)) {
      return false;
    }

    const statusCode = error.statusCode || error.status;
    if (statusCode >= 500) return false;
    if (statusCode >= 400 && statusCode < 500) return true;

    return [
      'StripeInvalidRequestError',
      'StripeAuthenticationError',
      'StripePermissionError',
      'StripeCardError',
      'StripeIdempotencyError',
    ].includes(type);
  }

  toMinorUnits(amount) {
    return Math.round(parseFloat(amount) * 100);
  }
}

module.exports = new PayoutTransferService();
