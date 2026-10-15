/**
 * Map a stored saved-payment-method row onto the guest-facing view shape.
 */
function toPaymentMethodView(record) {
  const data = record?.toJSON ? record.toJSON() : record;
  if (!data) {
    return null;
  }

  return {
    id: data.stripe_payment_method_id,
    brand: data.brand || null,
    last4: data.last4 || null,
    expMonth: data.exp_month ?? null,
    expYear: data.exp_year ?? null,
    cardholderName: data.cardholder_name || null,
    isDefault: Boolean(data.is_default),
    createdAt: data.created_at || null,
  };
}

module.exports = { toPaymentMethodView };
