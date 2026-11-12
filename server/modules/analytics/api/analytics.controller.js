const { getAuthenticatedUserId } = require('@helpers/auth-context.helper');
const analyticsService = require('../infrastructure/analytics-service.client');
const { publishLocationEvent } = require('../application/location-event.service');
const { publishDirectionsClick } = require('../application/directions-event.service');

const getSearchDemand = async (req, res) => {
  const { nextDays, limit } = req.query;

  const demand = await analyticsService.getSearchDemand({
    nextDays: nextDays ? parseInt(nextDays, 10) : 90,
    limit: limit ? parseInt(limit, 10) : 50,
  });

  res.status(200).json({
    success: true,
    data: {
      demand,
    },
  });
};

const getMySearchSummary = async (req, res) => {
  const userId = req.user.id;
  const summary = await analyticsService.getUserSearchSummary(userId);

  res.status(200).json({
    success: true,
    data: {
      summary,
    },
  });
};

const getMySearches = async (req, res) => {
  const userId = req.user.id;
  const { limit } = req.query;

  const searches = await analyticsService.getUserSearches(userId, {
    limit: limit ? parseInt(limit, 10) : 10,
  });

  res.status(200).json({
    success: true,
    data: {
      searches,
    },
  });
};

const trackDirectionsClick = async (req, res) => {
  const { hotelId, mode, source } = req.body;

  const result = await publishDirectionsClick({
    hotelId,
    mode,
    source,
    userId: getAuthenticatedUserId(req),
  });

  res.status(202).json({
    success: true,
    data: { eventId: result?.eventId ?? null },
  });
};

const trackLocationEvent = async (req, res) => {
  const { event, source, errorCode } = req.body;

  const result = await publishLocationEvent({
    event,
    source,
    errorCode,
    userId: getAuthenticatedUserId(req),
  });

  res.status(202).json({
    success: true,
    data: { eventId: result?.eventId ?? null },
  });
};

module.exports = {
  getSearchDemand,
  getMySearchSummary,
  getMySearches,
  trackLocationEvent,
  trackDirectionsClick,
};
