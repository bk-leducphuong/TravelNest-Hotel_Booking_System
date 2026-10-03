const { LedgerAccounts, LedgerEntries, HotelUsers } = require('@models/index.js');
const logger = require('@config/logger.config');

class LedgerRepository {
  buildAccountKey({ accountType, ownerType, ownerId, currency }) {
    return [accountType, ownerType, ownerId || 'platform', currency.toUpperCase()].join(':');
  }

  async findOrCreateAccount(accountData, options = {}) {
    try {
      const currency = (accountData.currency || 'USD').toUpperCase();
      const accountKey =
        accountData.accountKey ||
        accountData.account_key ||
        this.buildAccountKey({
          accountType: accountData.accountType || accountData.account_type,
          ownerType: accountData.ownerType || accountData.owner_type,
          ownerId: accountData.ownerId || accountData.owner_id,
          currency,
        });

      const [account] = await LedgerAccounts.findOrCreate({
        where: { account_key: accountKey },
        defaults: {
          account_key: accountKey,
          account_type: accountData.accountType || accountData.account_type,
          owner_type: accountData.ownerType || accountData.owner_type,
          owner_id: accountData.ownerId || accountData.owner_id || null,
          currency,
          name: accountData.name,
          metadata: accountData.metadata || null,
        },
        ...options,
      });

      return account;
    } catch (error) {
      logger.error('Error finding or creating ledger account:', error);
      throw error;
    }
  }

  async createEntries(entries, options = {}) {
    try {
      return await LedgerEntries.bulkCreate(entries, options);
    } catch (error) {
      logger.error('Error creating ledger entries:', error);
      throw error;
    }
  }

  async findByEntryGroupKey(entryGroupKey, options = {}) {
    try {
      return await LedgerEntries.findAll({
        where: { entry_group_key: entryGroupKey },
        include: options.include || [],
        order: [['created_at', 'ASC']],
        ...options,
      });
    } catch (error) {
      logger.error('Error finding ledger entries by group key:', error);
      throw error;
    }
  }

  async findPrimaryOwnerByHotelId(hotelId, options = {}) {
    try {
      const primaryOwner = await HotelUsers.findOne({
        where: {
          hotel_id: hotelId,
          is_primary_owner: true,
        },
        attributes: ['user_id'],
        ...options,
      });

      if (primaryOwner) {
        return primaryOwner.user_id;
      }

      const fallbackUser = await HotelUsers.findOne({
        where: { hotel_id: hotelId },
        attributes: ['user_id'],
        order: [['created_at', 'ASC']],
        ...options,
      });

      return fallbackUser?.user_id || null;
    } catch (error) {
      logger.error('Error finding primary hotel owner for ledger:', error);
      throw error;
    }
  }

  async findEntries(filters = {}, options = {}) {
    try {
      const where = {};
      if (filters.bookingId) where.booking_id = filters.bookingId;
      if (filters.transactionId) where.transaction_id = filters.transactionId;
      if (filters.paymentId) where.payment_id = filters.paymentId;
      if (filters.refundId) where.refund_id = filters.refundId;
      if (filters.payoutId) where.payout_id = filters.payoutId;
      if (filters.hotelId) where.hotel_id = filters.hotelId;
      if (filters.buyerId) where.buyer_id = filters.buyerId;
      if (filters.ownerId) where.owner_id = filters.ownerId;
      if (filters.eventType) where.event_type = filters.eventType;

      return await LedgerEntries.findAndCountAll({
        where,
        include: options.include || [{ model: LedgerAccounts, as: 'ledger_account' }],
        limit: options.limit || undefined,
        offset: options.offset || undefined,
        order: options.order || [['posted_at', 'DESC']],
        ...options,
      });
    } catch (error) {
      logger.error('Error finding ledger entries:', error);
      throw error;
    }
  }
}

module.exports = new LedgerRepository();
