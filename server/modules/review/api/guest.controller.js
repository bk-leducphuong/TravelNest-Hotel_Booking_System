const asyncHandler = require('@utils/asyncHandler');

const { createReview } = require('../application/createReview');
const { listHotelReviews } = require('../application/listHotelReviews');
const { listUserReviews } = require('../application/listUserReviews');
const { validateReviewEligibility } = require('../application/validateReviewEligibility');
const { checkAlreadyReviewed } = require('../application/checkAlreadyReviewed');
const { castReviewVote, removeReviewVote } = require('../application/reviewHelpfulVote');

const getHotelReviews = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  const { page, limit, minRating, maxRating, months, country, hasMedia, q } = req.query;

  const result = await listHotelReviews(hotelId, {
    page,
    limit,
    minRating,
    maxRating,
    months,
    country,
    hasMedia,
    q,
    // Reviews are public, so the viewer may be anonymous.
    viewerId: req.user?.id,
  });

  res.status(200).json({
    data: result.reviews,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      facets: result.facets,
    },
  });
});

const getUserReviews = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page, limit, status } = req.query;

  const result = await listUserReviews(userId, { page, limit, status });

  res.status(200).json({
    data: result.reviews,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      published: result.published,
      hidden: result.hidden,
    },
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

const putReviewVote = asyncHandler(async (req, res) => {
  const result = await castReviewVote(req.user.id, req.params.reviewId, req.body.isHelpful);

  res.status(200).json({ data: result });
});

const deleteReviewVote = asyncHandler(async (req, res) => {
  const result = await removeReviewVote(req.user.id, req.params.reviewId);

  res.status(200).json({ data: result });
});

module.exports = {
  getHotelReviews,
  getUserReviews,
  validateReview,
  checkReview,
  postReview,
  putReviewVote,
  deleteReviewVote,
};
