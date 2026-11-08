const express = require('express');

const { authenticate, optionalAuthenticate } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const analyticsSchema = require('./guest.schema');
const {
  getSearchDemand,
  getMySearchSummary,
  getMySearches,
  trackLocationEvent,
  trackDirectionsClick,
} = require('./analytics.controller');

const router = express.Router();

router.post(
  '/location-events',
  optionalAuthenticate,
  validate(analyticsSchema.trackLocationEvent),
  trackLocationEvent
);

router.post(
  '/directions',
  optionalAuthenticate,
  validate(analyticsSchema.trackDirectionsClick),
  trackDirectionsClick
);

router.get('/search/demand', validate(analyticsSchema.getSearchDemand), getSearchDemand);
router.get('/users/me/search-summary', authenticate, getMySearchSummary);
router.get(
  '/users/me/searches',
  authenticate,
  validate(analyticsSchema.getMySearches),
  getMySearches
);

module.exports = router;
