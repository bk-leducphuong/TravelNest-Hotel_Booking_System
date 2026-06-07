const express = require('express');

const {
  getSearchDemand,
  getMySearchSummary,
  getMySearches,
} = require('@controllers/v1/analytics.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const analyticsSchema = require('@validators/v1/analytics.schema');

const router = express.Router();

router.get('/search/demand', validate(analyticsSchema.getSearchDemand), getSearchDemand);
router.get('/users/me/search-summary', authenticate, getMySearchSummary);
router.get(
  '/users/me/searches',
  authenticate,
  validate(analyticsSchema.getMySearches),
  getMySearches
);

module.exports = router;
