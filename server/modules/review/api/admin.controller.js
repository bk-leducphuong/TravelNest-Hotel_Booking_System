const asyncHandler = require('@utils/asyncHandler');

const { listReviews } = require('../application/admin/listReviews');
const { getReview } = require('../application/admin/getReview');
const { setReviewStatus } = require('../application/admin/setReviewStatus');
const { replyToReview, updateReply, deleteReply } = require('../application/admin/replyToReview');
const { getReviewSummary } = require('../application/admin/getReviewSummary');

const listReviewsHandler = asyncHandler(async (req, res) => {
  const result = await listReviews({ ...req.query });

  res.status(200).json({
    data: result.reviews,
    meta: { page: result.page, limit: result.limit, total: result.total },
  });
});

const getReviewHandler = asyncHandler(async (req, res) => {
  const review = await getReview(req.params.reviewId);

  res.status(200).json({ data: review });
});

const getReviewSummaryHandler = asyncHandler(async (req, res) => {
  const summary = await getReviewSummary(req.query.hotelId);

  res.status(200).json({ data: summary });
});

const setReviewStatusHandler = asyncHandler(async (req, res) => {
  const result = await setReviewStatus(req.params.reviewId, {
    status: req.body.status,
    reason: req.body.reason,
    actorUserId: req.user.id,
    requestId: req.id,
  });

  res.status(200).json({ data: result });
});

const replyToReviewHandler = asyncHandler(async (req, res) => {
  const result = await replyToReview(req.params.reviewId, {
    reply: req.body.reply,
    actorUserId: req.user.id,
    requestId: req.id,
  });

  res.status(201).json({ data: result });
});

const updateReplyHandler = asyncHandler(async (req, res) => {
  const result = await updateReply(req.params.reviewId, {
    reply: req.body.reply,
    actorUserId: req.user.id,
    requestId: req.id,
  });

  res.status(200).json({ data: result });
});

const deleteReplyHandler = asyncHandler(async (req, res) => {
  const result = await deleteReply(req.params.reviewId, {
    actorUserId: req.user.id,
    requestId: req.id,
  });

  res.status(200).json({ data: result });
});

module.exports = {
  listReviewsHandler,
  getReviewHandler,
  getReviewSummaryHandler,
  setReviewStatusHandler,
  replyToReviewHandler,
  updateReplyHandler,
  deleteReplyHandler,
};
