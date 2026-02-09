const holdService = require('@services/hold.service');
const asyncHandler = require('@utils/asyncHandler');

/**
 * POST /api/hold
 * Create a temporary room hold (locks rooms while user completes payment)
 */
const createHold = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const {
    hotelId,
    checkInDate,
    checkOutDate,
    numberOfGuests,
    rooms,
    currency,
  } = req.body;

  const result = await holdService.createHold({
    userId,
    hotelId,
    checkInDate,
    checkOutDate,
    numberOfGuests: numberOfGuests ?? 1,
    rooms,
    currency,
  });

  res.status(201).json({
    data: result,
  });
});

/**
 * GET /api/hold
 * Get active holds for the authenticated user
 */
const getMyHolds = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const holds = await holdService.getActiveHoldsByUser(userId);
  res.status(200).json({
    data: holds,
  });
});

/**
 * GET /api/hold/:holdId
 * Get a single hold by ID (must own the hold)
 */
const getHoldById = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const { holdId } = req.params;
  const hold = await holdService.getHold(holdId, userId);
  res.status(200).json({
    data: hold,
  });
});

/**
 * DELETE /api/hold/:holdId
 * Release a hold (cancel checkout)
 */
const releaseHold = asyncHandler(async (req, res) => {
  const userId = req.session.user.user_id;
  const { holdId } = req.params;
  const result = await holdService.releaseHold(holdId, userId, 'released');
  res.status(200).json({
    data: result,
  });
});

module.exports = {
  createHold,
  getMyHolds,
  getHoldById,
  releaseHold,
};
