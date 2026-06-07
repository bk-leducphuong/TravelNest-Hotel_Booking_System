const Joi = require('joi');

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
