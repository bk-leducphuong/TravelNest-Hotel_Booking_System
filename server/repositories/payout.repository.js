const { Op } = require('sequelize');

const {
  Payouts,
  ConnectedPaymentAccounts,
  Hotels,
  Transactions,
  Users,
  Bookings,
  PayoutItems,
} = require('@models/index.js');
const logger = require('@config/logger.config');

class PayoutRepository {
  async create(payoutData, options = {}) {
    try {
      return await Payouts.create(
        {
          hotel_id: payoutData.hotelId || payoutData.hotel_id,
          owner_id: payoutData.ownerId || payoutData.owner_id,
          connected_payment_account_id:
            payoutData.connectedPaymentAccountId || payoutData.connected_payment_account_id,
          transaction_id: payoutData.transactionId || payoutData.transaction_id || null,
          provider: payoutData.provider || 'stripe',
          provider_payout_id: payoutData.providerPayoutId || payoutData.provider_payout_id || null,
          provider_transfer_id:
            payoutData.providerTransferId || payoutData.provider_transfer_id || null,
          amount: payoutData.amount,
          currency: payoutData.currency || 'USD',
          platform_fee_amount: payoutData.platformFeeAmount || payoutData.platform_fee_amount || 0,
          status: payoutData.status || 'pending',
          period_start: payoutData.periodStart || payoutData.period_start || null,
          period_end: payoutData.periodEnd || payoutData.period_end || null,
          paid_at: payoutData.paidAt || payoutData.paid_at || null,
          failure_code: payoutData.failureCode || payoutData.failure_code || null,
          failure_message: payoutData.failureMessage || payoutData.failure_message || null,
          metadata: payoutData.metadata || null,
        },
        options
      );
    } catch (error) {
      logger.error('Error creating payout:', error);
      throw error;
    }
  }

  async update(payoutId, updateData, options = {}) {
    try {
      const mappedData = {};

      if (updateData.status !== undefined) mappedData.status = updateData.status;
      if (
        updateData.providerPayoutId !== undefined ||
        updateData.provider_payout_id !== undefined
      ) {
        mappedData.provider_payout_id =
          updateData.providerPayoutId || updateData.provider_payout_id;
      }
      if (
        updateData.providerTransferId !== undefined ||
        updateData.provider_transfer_id !== undefined
      ) {
        mappedData.provider_transfer_id =
          updateData.providerTransferId || updateData.provider_transfer_id;
      }
      if (updateData.failureCode !== undefined || updateData.failure_code !== undefined) {
        mappedData.failure_code = updateData.failureCode || updateData.failure_code;
      }
      if (updateData.failureMessage !== undefined || updateData.failure_message !== undefined) {
        mappedData.failure_message = updateData.failureMessage || updateData.failure_message;
      }
      if (updateData.metadata !== undefined) mappedData.metadata = updateData.metadata;
      if (updateData.paidAt !== undefined || updateData.paid_at !== undefined) {
        mappedData.paid_at = updateData.paidAt || updateData.paid_at;
      }

      mappedData.updated_at = new Date();

      return await Payouts.update(mappedData, {
        where: { id: payoutId },
        ...options,
      });
    } catch (error) {
      logger.error('Error updating payout:', error);
      throw error;
    }
  }

  async findById(payoutId, options = {}) {
    try {
      return await Payouts.findOne({
        where: { id: payoutId },
        include: options.include || this.defaultInclude(),
        ...options,
      });
    } catch (error) {
      logger.error('Error finding payout by ID:', error);
      throw error;
    }
  }

  async findByProviderTransferId(providerTransferId, options = {}) {
    try {
      return await Payouts.findOne({
        where: { provider_transfer_id: providerTransferId },
        include: options.include || [],
        ...options,
      });
    } catch (error) {
      logger.error('Error finding payout by provider transfer ID:', error);
      throw error;
    }
  }

  async findByProviderPayoutId(providerPayoutId, options = {}) {
    try {
      return await Payouts.findOne({
        where: { provider_payout_id: providerPayoutId },
        include: options.include || [],
        ...options,
      });
    } catch (error) {
      logger.error('Error finding payout by provider payout ID:', error);
      throw error;
    }
  }

  async findAll(filters = {}, options = {}) {
    try {
      const { limit, offset, order, include, ...restOptions } = options;
      const where = {};

      if (filters.hotelId) where.hotel_id = filters.hotelId;
      if (filters.ownerId) where.owner_id = filters.ownerId;
      if (filters.connectedPaymentAccountId) {
        where.connected_payment_account_id = filters.connectedPaymentAccountId;
      }
      if (filters.transactionId) where.transaction_id = filters.transactionId;
      if (filters.status) where.status = filters.status;
      if (filters.dateFrom || filters.dateTo) {
        where.created_at = {};
        if (filters.dateFrom) where.created_at[Op.gte] = filters.dateFrom;
        if (filters.dateTo) where.created_at[Op.lte] = filters.dateTo;
      }

      return await Payouts.findAndCountAll({
        where,
        include: include || this.defaultInclude(),
        limit: limit || undefined,
        offset: offset || undefined,
        order: order || [['created_at', 'DESC']],
        ...restOptions,
      });
    } catch (error) {
      logger.error('Error finding payouts:', error);
      throw error;
    }
  }

  async findReadyConnectedAccount({ hotelId, ownerId }, options = {}) {
    try {
      const where = {
        payouts_enabled: true,
        onboarding_status: 'completed',
      };

      if (hotelId && ownerId) {
        where[Op.or] = [{ hotel_id: hotelId }, { hotel_id: null, user_id: ownerId }];
      } else if (hotelId) {
        where.hotel_id = hotelId;
      } else if (ownerId) {
        where.user_id = ownerId;
      }

      return await ConnectedPaymentAccounts.findOne({
        where,
        order: [
          ['is_default', 'DESC'],
          ['hotel_id', 'DESC'],
          ['updated_at', 'DESC'],
        ],
        ...options,
      });
    } catch (error) {
      logger.error('Error finding payout-ready connected account:', error);
      throw error;
    }
  }

  async findConnectedAccountById(connectedPaymentAccountId, options = {}) {
    try {
      return await ConnectedPaymentAccounts.findOne({
        where: { id: connectedPaymentAccountId },
        ...options,
      });
    } catch (error) {
      logger.error('Error finding connected payment account by ID:', error);
      throw error;
    }
  }

  async createItems(items, options = {}) {
    return await PayoutItems.bulkCreate(
      items.map((item) => ({
        payout_id: item.payoutId || item.payout_id,
        booking_id: item.bookingId || item.booking_id,
        transaction_id: item.transactionId || item.transaction_id,
        gross_amount: item.grossAmount || item.gross_amount,
        platform_fee_amount: item.platformFeeAmount || item.platform_fee_amount || 0,
        net_amount: item.netAmount || item.net_amount,
        currency: item.currency || 'USD',
      })),
      options
    );
  }

  async findEligibleBookingsForPayout(cutoffDate = new Date(), options = {}) {
    return await Bookings.findAll({
      where: {
        status: {
          [Op.in]: ['confirmed', 'completed'],
        },
        check_in_date: {
          [Op.lte]: cutoffDate,
        },
      },
      include: [
        {
          model: Transactions,
          as: 'transaction',
          where: {
            status: 'completed',
            transaction_type: 'payment',
          },
          required: true,
        },
        {
          model: PayoutItems,
          as: 'payout_item',
          required: false,
        },
      ],
      ...options,
    });
  }

  defaultInclude() {
    return [
      {
        model: Hotels,
        as: 'hotel',
        attributes: ['id', 'name'],
      },
      {
        model: Users,
        as: 'owner',
        attributes: ['id', 'email', 'first_name', 'last_name'],
      },
      {
        model: ConnectedPaymentAccounts,
        as: 'connected_payment_account',
        attributes: [
          'id',
          'provider',
          'provider_account_id',
          'payouts_enabled',
          'onboarding_status',
        ],
      },
      {
        model: Transactions,
        as: 'transaction',
        attributes: ['id', 'booking_id', 'amount', 'currency', 'status', 'transaction_type'],
      },
    ];
  }
}

module.exports = new PayoutRepository();
