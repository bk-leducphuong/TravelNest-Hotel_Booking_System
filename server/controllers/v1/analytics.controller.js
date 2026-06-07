const analyticsService = require('@services/analytics.service');
const asyncHandler = require('@utils/asyncHandler');

const getSearchDemand = asyncHandler(async (req, res) => {
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
});

const getMySearchSummary = asyncHandler(async (req, res) => {
  const userId = req.session.user.id;
  const summary = await analyticsService.getUserSearchSummary(userId);

  res.status(200).json({
    success: true,
    data: {
      summary,
    },
  });
});

const getMySearches = asyncHandler(async (req, res) => {
  const userId = req.session.user.id;
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
});

module.exports = {
  getSearchDemand,
  getMySearchSummary,
  getMySearches,
};
