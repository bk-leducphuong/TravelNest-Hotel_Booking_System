const CURRENCIES = [
  'USD',
];

function isValidCurrency(currency) {
  return CURRENCIES.includes(currency);
}

module.exports = {
  CURRENCIES,
  isValidCurrency,
};
