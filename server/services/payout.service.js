const sequelize = require('@config/database.config');
const logger = require('@config/logger.config');
const notificationService = require('@services/notification.service');
const ledgerService = require('@services/ledger.service');

const payoutRepository = require('@repositories/payout.repository');
const transactionRepository = require('@repositories/transaction.repository');
const ledgerRepository = require('@repositories/ledger.repository');

class PayoutService {
  async createManualPayout(payoutData, options = {}) {
    const payoutAmount = this.roundMoney(payoutData.amount);
    const platformFeeAmount = this.roundMoney(payoutData.platformFeeAmount || 0);
    const requestedConnectedAccountId =
      payoutData.connectedPaymentAccountId || payoutData.connected_payment_account_id;

    if (payoutAmount <= 0) {
      throw new Error('Payout amount must be greater than zero');
    }

    const connectedAccount = requestedConnectedAccountId
      ? await payoutRepository.findConnectedAccountById(requestedConnectedAccountId, options)
      : await payoutRepository.findReadyConnectedAccount({
          hotelId: payoutData.hotelId || payoutData.hotel_id,
          ownerId: payoutData.ownerId || payoutData.owner_id,
        }, options);

    if (!connectedAccount) {
      throw new Error('No payout-ready connected payment account found');
    }

    if (!connectedAccount.payouts_enabled || connectedAccount.onboarding_status !== 'completed') {
      throw new Error('Connected payment account is not ready for payouts');
    }

    const ownerId = payoutData.ownerId || payoutData.owner_id || connectedAccount.user_id;

    return await payoutRepository.create(
      {
        ...payoutData,
        ownerId,
        amount: payoutAmount,
        platformFeeAmount,
        connectedPaymentAccountId: connectedAccount.id,
        status: payoutData.status || 'pending',
      },
      options
    );
  }

  async createPayoutForTransaction(transactionId, options = {}) {
    const transaction = await transactionRepository.findById(transactionId);

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

    return await this.createManualPayout({
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
    });
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
        options.ownerId || (await ledgerRepository.findPrimaryOwnerByHotelId(bookingData.hotel_id));

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

      const payout = await this.withTransaction(async (dbTransaction) => {
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
          { transaction: dbTransaction }
        );

        await payoutRepository.createItems(
          [
            {
              payoutId: createdPayout.id,
              bookingId: bookingData.id,
              transactionId: transaction.id,
              grossAmount,
              platformFeeAmount,
              netAmount,
              currency: bookingData.currency,
            },
          ],
          { transaction: dbTransaction }
        );

        return createdPayout;
      });

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

    await payoutRepository.update(payout.id, { status: 'processing' });

    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const transfer = await stripe.transfers.create({
        amount: this.toMinorUnits(payout.amount),
        currency: payout.currency.toLowerCase(),
        destination: providerAccountId,
        metadata: {
          payout_id: payout.id,
          hotel_id: payout.hotel_id,
          owner_id: payout.owner_id,
          transaction_id: payout.transaction_id || '',
        },
      });

      await payoutRepository.update(payout.id, {
        status: 'paid',
        providerTransferId: transfer.id,
        paidAt: new Date(),
        metadata: {
          ...(payout.metadata || {}),
          stripe_transfer: {
            id: transfer.id,
            balance_transaction: transfer.balance_transaction,
            destination: transfer.destination,
          },
        },
      });

      const payoutData = payout.toJSON ? payout.toJSON() : payout;
      await ledgerService.recordPayoutPaid({
        payout: {
          ...payoutData,
          status: 'paid',
          provider_transfer_id: transfer.id,
          paid_at: new Date(),
        },
      });

      await notificationService.sendPayoutNotification({
        hotelId: payout.hotel_id,
        ownerId: payout.owner_id,
        payoutId: payout.id,
        status: 'completed',
        amount: payout.amount,
      });

      return await payoutRepository.findById(payout.id);
    } catch (error) {
      logger.error('Stripe transfer failed for payout:', error);

      await payoutRepository.update(payout.id, {
        status: 'failed',
        failureCode: error.code || error.type || 'stripe_transfer_failed',
        failureMessage: error.message,
      });

      await notificationService.sendPayoutNotification({
        hotelId: payout.hotel_id,
        ownerId: payout.owner_id,
        payoutId: payout.id,
        status: 'failed',
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
