const Joi = require('joi');

// `Joi.string().isoDate()` converts to a Date and would send a full timestamp to
// the partner, so validate the date-only shape explicitly and keep the string.
const dateOnly = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .custom((value, helpers) => {
    const parsed = new Date(`${value}T00:00:00Z`);

    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      return helpers.error('any.invalid');
    }

    return value;
  }, 'real calendar date')
  .messages({ 'any.invalid': '{{#label}} must be a real calendar date' });

/**
 * Search parameters accepted from the guest client. They are intentionally
 * permissive: the partner template decides which of them it needs, and a
 * placeholder the guest left blank is dropped from the URL.
 */
const searchFields = {
  // Flights.
  origin: Joi.string().trim().uppercase().max(80),
  destination: Joi.string().trim().max(160),
  departDate: dateOnly,
  returnDate: dateOnly.allow(''),
  adults: Joi.number().integer().min(1).max(9),
  children: Joi.number().integer().min(0).max(9),
  cabinClass: Joi.string().valid('economy', 'premium_economy', 'business', 'first'),

  // Airport transfers.
  pickup: Joi.string().trim().max(160),
  dropoff: Joi.string().trim().max(160),
  pickupDate: dateOnly,
  pickupTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/),
  passengers: Joi.number().integer().min(1).max(9),
  luggage: Joi.number().integer().min(0).max(9),
};

exports.getPartnerLink = {
  query: Joi.object({
    service: Joi.string().valid('flights', 'transfers').required(),
    ...searchFields,
  }),
};
