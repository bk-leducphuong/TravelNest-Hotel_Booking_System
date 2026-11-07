const sequelize = require('@config/database.config');
const logger = require('@config/logger.config');
const notificationModule = require('@modules/notification');
const paymentModule = require('@modules/payment');
const ApiError = require('@utils/ApiError');

const { settleTransfer } = require('./settleTransfer');

const payoutRepository = require('../infrastructure/payout.repository');

class PayoutService {
  async createManualPayout(payoutData, options = {}) {
    const payoutAmount = this.roundMoney(payoutData.amount);
    const platformFeeAmount = this.roundMoney(payoutData.platformFeeAmount || 0);
    const requestedConnectedAccountId =
      payoutData.connectedPaymentAccountId || payoutData.connected_payment_account_id;

    if (payoutAmount <= 0) {
      throw new ApiError(400, 'INVALID_PAYOUT_AMOUNT', 'Payout amount must be greater than zero');
    }

    const connectedAccount = requestedConnectedAccountId
      ? await payoutRepository.findConnectedAccountById(requestedConnectedAccountId, options)
      : await payoutRepository.findReadyConnectedAccount(
          {
            hotelId: payoutData.hotelId || payoutData.hotel_id,
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
      await paymentModule.lockHotelBalance(
        connectedAccount.hotel_id || payoutData.hotelId || payoutData.hotel_id,
        payoutData.currency || 'USD',
        txOptions
      );
      const hotelId = payoutData.hotelId || payoutData.hotel_id;
      const currency = payoutData.currency || 'USD';
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
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'completed') {
      throw new Error('Only completed transactions can be paid out');
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

  async createEligiblePayouts(options = {}) {
    const cutoffDate = options.cutoffDate || new Date();
    const eligibleBookings = await payoutRepository.findEligibleBookingsForPayout(cutoffDate);
    const created = [];

    for (const booking of eligibleBookings) {
      const bookingData = booking.toJSON ? booking.toJSON() : booking;
      if (bookingData.payout_item) continue;

      const transaction = bookingData.transaction;
      const ownerId =
        options.ownerId || (await paymentModule.getPrimaryOwnerByHotelId(bookingData.hotel_id));

      if (!ownerId) {
        logger.warn('Skipping payout creation; hotel owner not found', {
          bookingId: bookingData.id,
          hotelId: bookingData.hotel_id,
        });
        continue;
      }

      const platformFeeAmount = this.roundMoney(
        bookingData.platform_commission_amount ||
          this.calculatePlatformFee(bookingData.total_price, options.platformFeeRate)
      );
      const grossAmount = this.roundMoney(bookingData.total_price);
      const netAmount = this.roundMoney(grossAmount - platformFeeAmount);

      if (netAmount <= 0) continue;

      let payout;
      try {
        payout = await this.withTransaction(async (dbTransaction) => {
          const createdPayout = await this.createManualPayout(
            {
              hotelId: bookingData.hotel_id,
              ownerId,
              transactionId: transaction.id,
              amount: netAmount,
              currency: bookingData.currency,
              platformFeeAmount,
              periodStart: bookingData.check_in_date,
              periodEnd: bookingData.check_out_date,
              metadata: {
                booking_id: bookingData.id,
                booking_code: bookingData.booking_code,
                payout_eligibility_cutoff: cutoffDate,
              },
            },
            { transaction: dbTransaction, allowBalanceAdjustment: true }
          );

          await payoutRepository.createItems(
            [
              {
                payoutId: createdPayout.id,
                bookingId: bookingData.id,
                transactionId: transaction.id,
                grossAmount,
                platformFeeAmount,
                netAmount: Number(createdPayout.amount),
                currency: bookingData.currency,
              },
            ],
            { transaction: dbTransaction }
          );

          return createdPayout;
        });
      } catch (error) {
        // Owners without a payout-ready connected account are skipped, not
        // failed — so batch generation is not blocked by onboarding gaps.
        if (
          [
            'NO_PAYOUT_READY_ACCOUNT',
            'PAYOUT_ACCOUNT_NOT_READY',
            'PAYOUT_BALANCE_RESERVED',
          ].includes(error.code)
        ) {
          logger.warn('Skipping payout; no ready connected account', {
            bookingId: bookingData.id,
            hotelId: bookingData.hotel_id,
          });
          continue;
        }
        throw error;
      }

      created.push(payout);
    }

    return {
      scanned: eligibleBookings.length,
      created: created.length,
      payouts: created,
    };
  }

  async processStripeTransfer(payoutId) {
    const payout = await payoutRepository.findById(payoutId);

    if (!payout) {
      throw new Error('Payout not found');
    }

    if (payout.status !== 'pending') {
      throw new Error('Only pending payouts can be processed');
    }

    const providerAccountId = payout.connected_payment_account?.provider_account_id;
    if (!providerAccountId) {
      throw new Error('Payout connected account is missing provider account ID');
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    await sequelize.transaction(async (transaction) => {
      const options = { transaction };
      await paymentModule.lockHotelBalance(payout.hotel_id, payout.currency, options);
      const current = await payoutRepository.findForClaim(payout.id, {
        ...options,
        lock: transaction.LOCK.UPDATE,
      });
      if (current.status !== 'pending')
        throw new ApiError(409, 'PAYOUT_ALREADY_CLAIMED', 'Payout already claimed');
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
      if (Number(payout.amount) > available - reserved + 0.001)
        throw new ApiError(
          409,
          'PAYOUT_BALANCE_RESERVED',
          'Refund obligations or owner debt must be settled before this payout'
        );
      await payoutRepository.update(payout.id, { status: 'processing' }, options);
    });

    let settled = false;
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const transfer = await stripe.transfers.create(
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

      await settleTransfer(payout, transfer);
      settled = true;

      await notificationModule.sendPayoutNotification({
        hotelId: payout.hotel_id,
        ownerId: payout.owner_id,
        payoutId: payout.id,
        status: 'completed',
        amount: payout.amount,
      });

      return await payoutRepository.findById(payout.id);
    } catch (error) {
      if (settled) {
        logger.error(
          { payoutId: payout.id, error: error.message },
          'Payout settled; notification failed'
        );
        return payoutRepository.findById(payout.id);
      }
      logger.error('Stripe transfer failed for payout:', error);

      await payoutRepository.update(payout.id, {
        status: 'processing',
        failureCode: error.code || error.type || 'stripe_transfer_outcome_unknown',
        failureMessage: error.message,
      });

      await notificationModule.sendPayoutNotification({
        hotelId: payout.hotel_id,
        ownerId: payout.owner_id,
        payoutId: payout.id,
        status: 'processing',
        amount: payout.amount,
      });

      throw error;
    }
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

  calculatePlatformFee(amount, feeRate = 0) {
    return this.roundMoney(parseFloat(amount || 0) * parseFloat(feeRate || 0));
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
