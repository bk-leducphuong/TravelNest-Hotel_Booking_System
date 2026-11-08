const Joi = require('joi');

exports.trackLocationEvent = {
  body: Joi.object({
    event: Joi.string()
      .valid(
        'permission_prompted',
        'granted',
        'denied',
        'error',
        'approximate_used',
        'approximate_unavailable'
      )
      .required(),
    source: Joi.string().valid('browser', 'ip').default('browser'),
    errorCode: Joi.string()
      .valid('denied', 'unavailable', 'timeout', 'insecure', 'unsupported')
      .allow(null),
  }),
};

exports.getSearchDemand = {
  query: Joi.object({
    nextDays: Joi.number().integer().min(1).max(365).default(90),
    limit: Joi.number().integer().min(1).max(500).default(50),
  }),
};

exports.getMySearches = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};
