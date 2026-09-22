const asyncHandler = require('@utils/asyncHandler');

const { createReview } = require('../application/createReview');
const { listHotelReviews } = require('../application/listHotelReviews');
const { listUserReviews } = require('../application/listUserReviews');
const { validateReviewEligibility } = require('../application/validateReviewEligibility');
const { checkAlreadyReviewed } = require('../application/checkAlreadyReviewed');

const getHotelReviews = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const { page, limit } = req.query;

  const result = await listHotelReviews(hotelId, { page, limit });

  res.status(200).json({
    data: result.reviews,
    meta: { page: result.page, limit: result.limit, total: result.total },
  });
});

const getUserReviews = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit } = req.query;

  const result = await listUserReviews(userId, { page, limit });

  res.status(200).json({
    data: result.reviews,
    meta: { page: result.page, limit: result.limit, total: result.total },
  });
});

const validateReview = asyncHandler(async (req, res) => {
  const result = await validateReviewEligibility(req.user.id, {
    bookingCode: req.query.bookingCode,
    hotelId: req.query.hotelId,
  });

  res.status(200).json({ data: result });
});

const checkReview = asyncHandler(async (req, res) => {
  const result = await checkAlreadyReviewed(req.user.id, {
    bookingCode: req.query.bookingCode,
    hotelId: req.query.hotelId,
  });

  res.status(200).json({ data: result });
});

const postReview = asyncHandler(async (req, res) => {
  const result = await createReview(req.user.id, req.body);

  res.status(201).json({
    data: { ...result, message: 'Review posted successfully' },
  });
});

module.exports = {
  getHotelReviews,
  getUserReviews,
  validateReview,
  checkReview,
  postReview,
};
