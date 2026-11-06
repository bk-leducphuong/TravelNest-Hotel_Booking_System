const { SavedPaymentMethods } = require('@platform/database');

/**
 * Saved Payment Method Repository
 *
 * Owns the local mirror of a user's Stripe payment methods. Stripe remains the
 * source of truth for the card data; this table provides fast listing and the
 * `is_default` badge without a round-trip per read.
 */

class SavedPaymentMethodRepository {
  async findByUserId(userId, options = {}) {
    return await SavedPaymentMethods.findAll({
      where: { user_id: userId },
      order: [
        ['is_default', 'DESC'],
        ['created_at', 'DESC'],
      ],
      ...options,
    });
  }

  async findByPaymentMethodId(paymentMethodId) {
    return await SavedPaymentMethods.findOne({
      where: { stripe_payment_method_id: paymentMethodId },
    });
  }

  async findDefaultByUserId(userId) {
    return await SavedPaymentMethods.findOne({
      where: { user_id: userId, is_default: true },
    });
  }

  async countByUserId(userId) {
    return await SavedPaymentMethods.count({ where: { user_id: userId } });
  }

  async create(data, options = {}) {
    return await SavedPaymentMethods.create(
      {
        user_id: data.userId || data.user_id,
        stripe_customer_id: data.customerId || data.stripe_customer_id,
        stripe_payment_method_id: data.paymentMethodId || data.stripe_payment_method_id,
        brand: data.brand || null,
        last4: data.last4 || null,
        exp_month: data.expMonth ?? data.exp_month ?? null,
        exp_year: data.expYear ?? data.exp_year ?? null,
        cardholder_name: data.cardholderName || data.cardholder_name || null,
        is_default: data.isDefault ?? data.is_default ?? false,
        metadata: data.metadata || null,
      },
      options
    );
  }

  async updateByPaymentMethodId(paymentMethodId, updateData, options = {}) {
    const mapped = {};

    if (updateData.brand !== undefined) mapped.brand = updateData.brand;
    if (updateData.last4 !== undefined) mapped.last4 = updateData.last4;
    if (updateData.expMonth !== undefined || updateData.exp_month !== undefined)
      mapped.exp_month = updateData.expMonth ?? updateData.exp_month;
    if (updateData.expYear !== undefined || updateData.exp_year !== undefined)
      mapped.exp_year = updateData.expYear ?? updateData.exp_year;
    if (updateData.cardholderName !== undefined || updateData.cardholder_name !== undefined)
      mapped.cardholder_name = updateData.cardholderName ?? updateData.cardholder_name;
    if (updateData.isDefault !== undefined || updateData.is_default !== undefined)
      mapped.is_default = updateData.isDefault ?? updateData.is_default;
    if (updateData.metadata !== undefined) mapped.metadata = updateData.metadata;

    return await SavedPaymentMethods.update(mapped, {
      where: { stripe_payment_method_id: paymentMethodId },
      ...options,
    });
  }

  async deleteByPaymentMethodId(paymentMethodId, options = {}) {
    return await SavedPaymentMethods.destroy({
      where: { stripe_payment_method_id: paymentMethodId },
      ...options,
    });
  }

  async clearDefaultForUser(userId, options = {}) {
    return await SavedPaymentMethods.update(
      { is_default: false },
      { where: { user_id: userId, is_default: true }, ...options }
    );
  }

  async setDefaultById(id, options = {}) {
    return await SavedPaymentMethods.update({ is_default: true }, { where: { id }, ...options });
  }
}

module.exports = new SavedPaymentMethodRepository();
