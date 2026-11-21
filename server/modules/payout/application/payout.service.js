const sequelize = require('@config/database.config');
const logger = require('@config/logger.config');
const notificationModule = require('@modules/notification');
const paymentModule = require('@modules/payment');
const ApiError = require('@utils/ApiError');

const { settleTransfer } = require('./settleTransfer');
const settings = require('./payout-settings');

const payoutRepository = require('../infrastructure/payout.repository');
const { getStripe, isStripeConfigured } = require('../infrastructure/stripe-client');

class PayoutService {
  async createManualPayout(payoutData, options = {}) {
    const payoutAmount = this.roundMoney(payoutData.amount);
    const platformFeeAmount = this.roundMoney(payoutData.platformFeeAmount || 0);
    const requestedConnectedAccountId =
      payoutData.connectedPaymentAccountId || payoutData.connected_payment_account_id;
    const hotelId = payoutData.hotelId || payoutData.hotel_id;
    const currency = (payoutData.currency || 'USD').toUpperCase();

    if (payoutAmount <= 0) {
      throw new ApiError(400, 'INVALID_PAYOUT_AMOUNT', 'Payout amount must be greater than zero');
    }

    if (!hotelId) {
      throw new ApiError(400, 'PAYOUT_HOTEL_REQUIRED', 'A payout must belong to a hotel');
    }

    const connectedAccount = requestedConnectedAccountId
      ? await payoutRepository.findConnectedAccountById(requestedConnectedAccountId, options)
      : await payoutRepository.findReadyConnectedAccount(
          {
            hotelId,
            ownerId: payoutData.ownerId || payoutData.owner_id,
          },
          options
        );

    if (!connectedAccount) {
      throw new ApiError(
        409,
        'NO_PAYOUT_READY_ACCOUNT',
        'No payout-ready connected payment account found'
      );
    }

    if (!connectedAccount.payouts_enabled || connectedAccount.onboarding_status !== 'completed') {
      throw new ApiError(
        409,
        'PAYOUT_ACCOUNT_NOT_READY',
        'Connected payment account is not ready for payouts'
      );
    }

    const ownerId = payoutData.ownerId || payoutData.owner_id || connectedAccount.user_id;

    const create = async (transaction) => {
      const txOptions = { ...options, transaction };
      await paymentModule.lockHotelBalance(hotelId, currency, txOptions);
      const available = await paymentModule.availableHotelBalance(hotelId, currency, txOptions);
      const reserved = await payoutRepository.sumReserved(hotelId, currency, null, txOptions);
      const payable = Math.max(0, this.roundMoney(available - reserved));
      const amount = options.allowBalanceAdjustment
        ? Math.min(payoutAmount, payable)
        : payoutAmount;
      if (!(amount > 0) || amount > payable + 0.001)
        throw new ApiError(
          409,
          'PAYOUT_BALANCE_RESERVED',
          'Refund obligations or owner debt must be settled before this payout'
        );
      return payoutRepository.create(
        {
          ...payoutData,
          ownerId,
          amount,
          currency,
          platformFeeAmount,
          connectedPaymentAccountId: connectedAccount.id,
          status: payoutData.status || 'pending',
          metadata: {
            ...(payoutData.metadata || {}),
            owner_debt_deduction: this.roundMoney(payoutAmount - amount),
          },
        },
        txOptions
      );
    };
    return options.transaction ? create(options.transaction) : sequelize.transaction(create);
  }

  async createPayoutForTransaction(transactionId, options = {}) {
    const transaction = await paymentModule.getTransactionById(transactionId);

    if (!transaction) {
      throw new ApiError(404, 'TRANSACTION_NOT_FOUND', 'Transaction not found');
    }

    if (transaction.status !== 'completed') {
      throw new ApiError(
        409,
        'TRANSACTION_NOT_COMPLETED',
        'Only completed transactions can be paid out'
      );
    }

    const platformFeeAmount = this.calculatePlatformFee(
      transaction.amount,
      options.platformFeeRate
    );
    const payoutAmount = this.roundMoney(parseFloat(transaction.amount) - platformFeeAmount);

    return await this.createManualPayout(
      {
        hotelId: transaction.hotel_id,
        ownerId: options.ownerId,
        transactionId: transaction.id,
        amount: payoutAmount,
        currency: transaction.currency,
        platformFeeAmount,
        periodStart: options.periodStart,
        periodEnd: options.periodEnd,
        metadata: {
          ...(options.metadata || {}),
          source_transaction_id: transaction.id,
          gross_transaction_amount: transaction.amount,
        },
      },
      { allowBalanceAdjustment: true }
    );
  }

  /**
   * Generate payouts for every eligible booking.
   *
   * Bookings are grouped per hotel/owner/currency and settled in one payout per
   * group (one `payout_items` row per booking) to keep Stripe transfers and the
   * owner's payout history manageable. The unique `payout_items.booking_id`
   * constraint is the final duplicate guard, so a concurrent run can safely
   * retry after the duplicate row rolls its transaction back.
   */
  async createEligiblePayouts(options = {}) {
    const cutoffDate = options.cutoffDate || settings.getEligibilityCutoffDate();
    const eligibleBookings = await payoutRepository.findEligibleBookingsForPayout(
      cutoffDate,
      { hotelId: options.hotelId || options.hotel_id },
      { limit: options.limit || settings.getBatchSize() }
    );
    const ownerCache = new Map();
    const groups = new Map();

    for (const booking of eligibleBookings) {
      const bookingData = booking.toJSON ? booking.toJSON() : booking;
      if (bookingData.payout_item) continue;

      const transaction = bookingData.transaction;
      if (!transaction) continue;

      const ownerId = await this.resolveOwnerId(bookingData.hotel_id, options.ownerId, ownerCache);

      if (!ownerId) {
        logger.warn('Skipping payout creation; hotel owner not found', {
          bookingId: bookingData.id,
          hotelId: bookingData.hotel_id,
        });
        continue;
      }

      if (options.ownerId && String(ownerId) !== String(options.ownerId)) continue;

      const grossAmount = this.roundMoney(bookingData.total_price);
      const platformFeeAmount = this.roundMoney(
        bookingData.platform_commission_amount ??
          this.calculatePlatformFee(grossAmount, options.platformFeeRate)
      );
      const netAmount = this.roundMoney(grossAmount - platformFeeAmount);

      if (netAmount <= 0) continue;

      const currency = (bookingData.currency || 'USD').toUpperCase();
      const groupKey = [bookingData.hotel_id, ownerId, currency].join('|');
      let group = groups.get(groupKey);

      if (!group) {
        group = {
          hotelId: bookingData.hotel_id,
          ownerId,
          currency,
          grossAmount: 0,
          platformFeeAmount: 0,
          netAmount: 0,
          periodStart: null,
          periodEnd: null,
          bookings: [],
        };
        groups.set(groupKey, group);
      }

      group.grossAmount = this.roundMoney(group.grossAmount + grossAmount);
      group.platformFeeAmount = this.roundMoney(group.platformFeeAmount + platformFeeAmount);
      group.netAmount = this.roundMoney(group.netAmount + netAmount);
      group.periodStart = this.earlierDate(group.periodStart, bookingData.check_in_date);
      group.periodEnd = this.laterDate(group.periodEnd, bookingData.check_out_date);
      group.bookings.push({
        booking: bookingData,
        transaction,
        grossAmount,
        platformFeeAmount,
        netAmount,
      });
    }

    const created = [];
    const minimum = options.minimumAmount ?? settings.getMinimumPayoutAmount();

    for (const group of groups.values()) {
      if (group.netAmount < minimum) continue;

      try {
        const payout = await this.withTransaction(async (dbTransaction) => {
          const createdPayout = await this.createManualPayout(
            {
              hotelId: group.hotelId,
              ownerId: group.ownerId,
              amount: group.netAmount,
              currency: group.currency,
              platformFeeAmount: group.platformFeeAmount,
              periodStart: group.periodStart,
              periodEnd: group.periodEnd,
              metadata: {
                booking_ids: group.bookings.map((item) => item.booking.id),
                booking_count: group.bookings.length,
                gross_amount: group.grossAmount,
                net_amount: group.netAmount,
                payout_eligibility_cutoff: cutoffDate,
              },
            },
            { transaction: dbTransaction, allowBalanceAdjustment: true }
          );

          await payoutRepository.createItems(
            group.bookings.map((item) => ({
              payoutId: createdPayout.id,
              bookingId: item.booking.id,
              transactionId: item.transaction.id,
              grossAmount: item.grossAmount,
              platformFeeAmount: item.platformFeeAmount,
              netAmount: item.netAmount,
              currency: group.currency,
            })),
            { transaction: dbTransaction }
          );

          return createdPayout;
        });
        created.push(payout);
      } catch (error) {
        // Another worker may have claimed one of the bookings between our read
        // and the insert. The unique booking_id index rolls the whole group
        // back, so the next run can pick it up safely.
        if (error.name === 'SequelizeUniqueConstraintError') {
          logger.warn('Skipping payout group already claimed by another run', {
            hotelId: group.hotelId,
            ownerId: group.ownerId,
            bookingIds: group.bookings.map((item) => item.booking.id),
          });
          continue;
        }

        // Owners without a payout-ready connected account are skipped, not
        // failed — so batch generation is not blocked by onboarding gaps.
        if (
          [
            'NO_PAYOUT_READY_ACCOUNT',
            'PAYOUT_ACCOUNT_NOT_READY',
            'PAYOUT_BALANCE_RESERVED',
          ].includes(error.code)
        ) {
          logger.warn('Skipping payout; no ready connected account or balance reserved', {
            hotelId: group.hotelId,
            ownerId: group.ownerId,
            bookingCount: group.bookings.length,
            code: error.code,
          });
          continue;
        }
        throw error;
      }
    }

    return {
      scanned: eligibleBookings.length,
      created: created.length,
      payouts: created,
    };
  }

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

  async markPayoutStatus(payoutId, status, updateData = {}) {
    const mappedUpdate = {
      status,
      ...updateData,
    };

    if (status === 'paid' && !mappedUpdate.paidAt && !mappedUpdate.paid_at) {
      mappedUpdate.paidAt = new Date();
    }

    await payoutRepository.update(payoutId, mappedUpdate);
    return await payoutRepository.findById(payoutId);
  }

  async resolveOwnerId(hotelId, requestedOwnerId, cache) {
    if (requestedOwnerId) return requestedOwnerId;
    if (cache.has(hotelId)) return cache.get(hotelId);

    const ownerId = await paymentModule.getPrimaryOwnerByHotelId(hotelId);
    cache.set(hotelId, ownerId || null);
    return ownerId || null;
  }

  earlierDate(current, candidate) {
    if (!candidate) return current;
    const date = new Date(candidate);
    if (!current || date < current) return date;
    return current;
  }

  laterDate(current, candidate) {
    if (!candidate) return current;
    const date = new Date(candidate);
    if (!current || date > current) return date;
    return current;
  }

  calculatePlatformFee(amount, feeRate) {
    const rate = this.normalizeFeeRate(
      feeRate !== undefined && feeRate !== null && feeRate !== ''
        ? feeRate
        : process.env.PLATFORM_FEE_RATE || 0
    );
    return this.roundMoney(parseFloat(amount || 0) * rate);
  }

  normalizeFeeRate(feeRate) {
    const parsedRate = parseFloat(feeRate || 0);
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) return 0;
    return parsedRate > 1 ? parsedRate / 100 : parsedRate;
  }

  toMinorUnits(amount) {
    return Math.round(parseFloat(amount) * 100);
  }

  roundMoney(value) {
    return Math.round(parseFloat(value || 0) * 100) / 100;
  }

  async withTransaction(callback) {
    return await sequelize.transaction(callback);
  }
}

module.exports = new PayoutService();
