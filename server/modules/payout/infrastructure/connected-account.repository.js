const { connected_payment_accounts: ConnectedPaymentAccounts } = require('@models/index.js');

/**
 * Payout module repository for provider connected accounts (Stripe Connect).
 */
const UPDATABLE_FIELDS = {
  providerAccountId: 'provider_account_id',
  provider_account_id: 'provider_account_id',
  accountType: 'account_type',
  account_type: 'account_type',
  country: 'country',
  defaultCurrency: 'default_currency',
  default_currency: 'default_currency',
  chargesEnabled: 'charges_enabled',
  charges_enabled: 'charges_enabled',
  payoutsEnabled: 'payouts_enabled',
  payouts_enabled: 'payouts_enabled',
  detailsSubmitted: 'details_submitted',
  details_submitted: 'details_submitted',
  onboardingStatus: 'onboarding_status',
  onboarding_status: 'onboarding_status',
  disabledReason: 'disabled_reason',
  disabled_reason: 'disabled_reason',
  requirementsCurrentlyDue: 'requirements_currently_due',
  requirements_currently_due: 'requirements_currently_due',
  requirementsEventuallyDue: 'requirements_eventually_due',
  requirements_eventually_due: 'requirements_eventually_due',
  capabilities: 'capabilities',
  isDefault: 'is_default',
  is_default: 'is_default',
  lastSyncedAt: 'last_synced_at',
  last_synced_at: 'last_synced_at',
  metadata: 'metadata',
};

class ConnectedAccountRepository {
  async findById(accountId, options = {}) {
    return await ConnectedPaymentAccounts.findOne({ where: { id: accountId }, ...options });
  }

  async findByProviderAccountId(providerAccountId, options = {}) {
    return await ConnectedPaymentAccounts.findOne({
      where: { provider_account_id: providerAccountId },
      ...options,
    });
  }

  async findForHotel(hotelId, options = {}) {
    return await ConnectedPaymentAccounts.findAll({
      where: { hotel_id: hotelId },
      order: [
        ['is_default', 'DESC'],
        ['updated_at', 'DESC'],
      ],
      ...options,
    });
  }

  async findForOwner(ownerId, options = {}) {
    return await ConnectedPaymentAccounts.findAll({
      where: { user_id: ownerId },
      order: [
        ['is_default', 'DESC'],
        ['updated_at', 'DESC'],
      ],
      ...options,
    });
  }

  async findExisting({ hotelId, ownerId }, options = {}) {
    const where = {};

    if (hotelId) {
      where.hotel_id = hotelId;
    } else if (ownerId) {
      where.user_id = ownerId;
    }

    return await ConnectedPaymentAccounts.findOne({
      where,
      order: [
        ['is_default', 'DESC'],
        ['updated_at', 'DESC'],
      ],
      ...options,
    });
  }

  async create(data, options = {}) {
    return await ConnectedPaymentAccounts.create(
      {
        user_id: data.userId || data.user_id,
        hotel_id: data.hotelId || data.hotel_id || null,
        provider: data.provider || 'stripe',
        provider_account_id: data.providerAccountId || data.provider_account_id,
        account_type: data.accountType || data.account_type || 'express',
        country: data.country || null,
        default_currency: data.defaultCurrency || data.default_currency || null,
        charges_enabled: data.chargesEnabled ?? false,
        payouts_enabled: data.payoutsEnabled ?? false,
        details_submitted: data.detailsSubmitted ?? false,
        onboarding_status: data.onboardingStatus || data.onboarding_status || 'not_started',
        metadata: data.metadata || null,
        is_default: data.isDefault ?? false,
      },
      options
    );
  }

  async update(accountId, updateData, options = {}) {
    const mapped = {};

    for (const [key, column] of Object.entries(UPDATABLE_FIELDS)) {
      if (updateData[key] !== undefined) {
        mapped[column] = updateData[key];
      }
    }

    if (Object.keys(mapped).length === 0) {
      return [0];
    }

    return await ConnectedPaymentAccounts.update(mapped, {
      where: { id: accountId },
      ...options,
    });
  }
}

module.exports = new ConnectedAccountRepository();
