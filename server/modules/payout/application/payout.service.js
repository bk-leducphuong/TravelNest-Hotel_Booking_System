const sequelize = require('@config/database.config');
const logger = require('@config/logger.config');
const paymentModule = require('@modules/payment');
const ApiError = require('@utils/ApiError');

const settings = require('./payout-settings');
const payoutTransferService = require('./payout-transfer.service');

const payoutRepository = require('../infrastructure/payout.repository');

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
    return await payoutTransferService.processStripeTransfer(payoutId);
  }

  async claimPayoutForTransfer(payoutId) {
    return await payoutTransferService.claimPayoutForTransfer(payoutId);
  }

  async resumeStripeTransfer(payoutId) {
    return await payoutTransferService.resumeStripeTransfer(payoutId);
  }

  async executeTransfer(payout, providerAccountId, options) {
    return await payoutTransferService.executeTransfer(payout, providerAccountId, options);
  }

  async failTransfer(payout, error, options) {
    return await payoutTransferService.failTransfer(payout, error, options);
  }

  async notify(payout, status, reason) {
    return await payoutTransferService.notify(payout, status, reason);
  }

  isDefinitiveTransferError(error) {
    return payoutTransferService.isDefinitiveTransferError(error);
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

  roundMoney(value) {
    return Math.round(parseFloat(value || 0) * 100) / 100;
  }

  async withTransaction(callback) {
    return await sequelize.transaction(callback);
  }
}

module.exports = new PayoutService();
