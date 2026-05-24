const { uuidv7 } = require('uuidv7');

const sequelize = require('@config/database.config');
const ledgerRepository = require('@repositories/ledger.repository');

class LedgerService {
  async recordPaymentSucceeded(
    { transaction, payment, booking, ownerId, platformFeeRate },
    options = {}
  ) {
    const tx = transaction.toJSON ? transaction.toJSON() : transaction;
    const paymentData = payment?.toJSON ? payment.toJSON() : payment;
    const bookingData = booking?.toJSON ? booking.toJSON() : booking;
    const amount = this.roundMoney(tx.amount);
    const currency = (tx.currency || 'USD').toUpperCase();
    const hotelId = tx.hotel_id || bookingData?.hotel_id;
    const resolvedOwnerId =
      ownerId ||
      (hotelId ? await ledgerRepository.findPrimaryOwnerByHotelId(hotelId, options) : null);
    const feeRate = this.normalizeFeeRate(platformFeeRate);
    const platformFeeAmount = this.roundMoney(amount * feeRate);
    const payableAmount = this.roundMoney(amount - platformFeeAmount);
    const entryGroupKey = `payment_succeeded:${tx.id}`;

    return await this.postBalancedEntries(
      {
        entryGroupKey,
        eventType: 'payment_succeeded',
        currency,
        context: {
          booking_id: tx.booking_id || bookingData?.id || null,
          transaction_id: tx.id,
          payment_id: paymentData?.id || null,
          hotel_id: hotelId || null,
          buyer_id: tx.buyer_id || bookingData?.buyer_id || null,
          owner_id: resolvedOwnerId,
          provider: 'stripe',
          provider_event_id: tx.stripe_payment_intent_id || null,
          metadata: {
            platform_fee_rate: feeRate,
            platform_fee_amount: platformFeeAmount,
            hotel_payable_amount: payableAmount,
          },
        },
        lines: [
          {
            account: this.platformCashAccount(currency),
            direction: 'debit',
            amount,
            description: 'Customer payment received',
          },
          {
            account: this.hotelPayableAccount(hotelId, currency),
            direction: 'credit',
            amount: payableAmount,
            description: 'Hotel owner payable created',
          },
          {
            account: this.platformRevenueAccount(currency),
            direction: 'credit',
            amount: platformFeeAmount,
            description: 'Platform fee recognized',
          },
        ],
      },
      options
    );
  }

  async recordRefundSucceeded({ refund, transaction, platformFeeRate }, options = {}) {
    const refundData = refund.toJSON ? refund.toJSON() : refund;
    const tx = transaction?.toJSON ? transaction.toJSON() : transaction;
    const amount = this.roundMoney(refundData.amount);
    const currency = (refundData.currency || tx?.currency || 'USD').toUpperCase();
    const hotelId = refundData.hotel_id || tx?.hotel_id;
    const ownerId = hotelId
      ? await ledgerRepository.findPrimaryOwnerByHotelId(hotelId, options)
      : null;
    const feeRate = this.normalizeFeeRate(platformFeeRate);
    const platformFeeReversal = this.roundMoney(amount * feeRate);
    const payableReversal = this.roundMoney(amount - platformFeeReversal);
    const entryGroupKey = `refund_succeeded:${refundData.id}`;

    return await this.postBalancedEntries(
      {
        entryGroupKey,
        eventType: 'refund_succeeded',
        currency,
        context: {
          booking_id: refundData.booking_id || tx?.booking_id || null,
          transaction_id: refundData.transaction_id || tx?.id || null,
          refund_id: refundData.id,
          hotel_id: hotelId || null,
          buyer_id: refundData.buyer_id || tx?.buyer_id || null,
          owner_id: ownerId,
          provider: refundData.provider || 'stripe',
          provider_event_id: refundData.provider_refund_id || tx?.stripe_refund_id || null,
          metadata: {
            platform_fee_rate: feeRate,
            platform_fee_reversal_amount: platformFeeReversal,
            hotel_payable_reversal_amount: payableReversal,
          },
        },
        lines: [
          {
            account: this.hotelPayableAccount(hotelId, currency),
            direction: 'debit',
            amount: payableReversal,
            description: 'Hotel owner payable reversed for refund',
          },
          {
            account: this.platformRevenueAccount(currency),
            direction: 'debit',
            amount: platformFeeReversal,
            description: 'Platform fee reversed for refund',
          },
          {
            account: this.platformCashAccount(currency),
            direction: 'credit',
            amount,
            description: 'Customer refund paid',
          },
        ],
      },
      options
    );
  }

  async recordPayoutPaid({ payout }, options = {}) {
    const payoutData = payout.toJSON ? payout.toJSON() : payout;
    const amount = this.roundMoney(payoutData.amount);
    const currency = (payoutData.currency || 'USD').toUpperCase();
    const entryGroupKey = `payout_paid:${payoutData.id}`;

    return await this.postBalancedEntries(
      {
        entryGroupKey,
        eventType: 'payout_paid',
        currency,
        context: {
          transaction_id: payoutData.transaction_id || null,
          payout_id: payoutData.id,
          hotel_id: payoutData.hotel_id,
          owner_id: payoutData.owner_id,
          provider: payoutData.provider || 'stripe',
          provider_event_id:
            payoutData.provider_transfer_id || payoutData.provider_payout_id || null,
          metadata: {
            connected_payment_account_id: payoutData.connected_payment_account_id,
            provider_transfer_id: payoutData.provider_transfer_id,
            provider_payout_id: payoutData.provider_payout_id,
          },
        },
        lines: [
          {
            account: this.hotelPayableAccount(payoutData.hotel_id, currency),
            direction: 'debit',
            amount,
            description: 'Hotel owner payable settled',
          },
          {
            account: this.platformCashAccount(currency),
            direction: 'credit',
            amount,
            description: 'Payout transferred to hotel owner',
          },
        ],
      },
      options
    );
  }

  async postBalancedEntries(posting, options = {}) {
    return await this.withTransaction(options, async (transaction) => {
      const existing = await ledgerRepository.findByEntryGroupKey(posting.entryGroupKey, {
        transaction,
      });

      if (existing.length > 0) {
        return existing;
      }

      const lines = posting.lines.filter((line) => this.roundMoney(line.amount) > 0);
      this.assertBalanced(lines);

      const entryGroupId = uuidv7();
      const entries = [];

      for (const [index, line] of lines.entries()) {
        const account = await ledgerRepository.findOrCreateAccount(line.account, {
          transaction,
        });

        entries.push({
          ledger_account_id: account.id,
          entry_group_id: entryGroupId,
          entry_group_key: posting.entryGroupKey,
          direction: line.direction,
          amount: this.roundMoney(line.amount),
          currency: posting.currency,
          event_type: posting.eventType,
          ...posting.context,
          idempotency_key: `${posting.entryGroupKey}:${index + 1}`,
          description: line.description,
          posted_at: posting.postedAt || new Date(),
          created_at: new Date(),
        });
      }

      return await ledgerRepository.createEntries(entries, { transaction });
    });
  }

  assertBalanced(lines) {
    const debitTotal = this.roundMoney(
      lines
        .filter((line) => line.direction === 'debit')
        .reduce((sum, line) => sum + this.roundMoney(line.amount), 0)
    );
    const creditTotal = this.roundMoney(
      lines
        .filter((line) => line.direction === 'credit')
        .reduce((sum, line) => sum + this.roundMoney(line.amount), 0)
    );

    if (debitTotal <= 0 || creditTotal <= 0 || debitTotal !== creditTotal) {
      throw new Error(
        `Ledger entries are not balanced: debit=${debitTotal}, credit=${creditTotal}`
      );
    }
  }

  platformCashAccount(currency) {
    return {
      accountType: 'platform_cash',
      ownerType: 'platform',
      currency,
      name: `Platform cash ${currency}`,
    };
  }

  platformRevenueAccount(currency) {
    return {
      accountType: 'platform_revenue',
      ownerType: 'platform',
      currency,
      name: `Platform revenue ${currency}`,
    };
  }

  hotelPayableAccount(hotelId, currency) {
    return {
      accountType: 'hotel_owner_payable',
      ownerType: 'hotel',
      ownerId: hotelId,
      currency,
      name: `Hotel payable ${currency}`,
    };
  }

  normalizeFeeRate(feeRate) {
    const rawRate =
      feeRate !== undefined && feeRate !== null ? feeRate : process.env.PLATFORM_FEE_RATE || 0;
    const parsedRate = parseFloat(rawRate || 0);

    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      return 0;
    }

    return parsedRate > 1 ? parsedRate / 100 : parsedRate;
  }

  roundMoney(value) {
    return Math.round(parseFloat(value || 0) * 100) / 100;
  }

  async withTransaction(options, callback) {
    if (options.transaction) {
      return await callback(options.transaction);
    }

    return await sequelize.transaction(callback);
  }
}

module.exports = new LedgerService();
