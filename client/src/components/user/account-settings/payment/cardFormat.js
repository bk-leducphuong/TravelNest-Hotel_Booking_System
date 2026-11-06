const BRAND_LABELS = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  diners: 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay',
};

/** Human label for a Stripe card brand. */
export function cardBrandLabel(brand) {
  if (!brand) {
    return 'Card';
  }

  return BRAND_LABELS[brand] || brand.charAt(0).toUpperCase() + brand.slice(1);
}

/** Format an expiry as MM/YY, or a dash when unknown. */
export function formatCardExpiry(month, year) {
  if (!month || !year) {
    return '--/--';
  }

  const paddedMonth = String(month).padStart(2, '0');
  const shortYear = String(year).slice(-2);

  return `${paddedMonth}/${shortYear}`;
}
