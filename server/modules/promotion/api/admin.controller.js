const {
  getPromotion,
  listPromotions,
  createPromotion,
  updatePromotion,
  activatePromotion,
  pausePromotion,
  archivePromotion,
  listRedemptions,
} = require('../application/admin/managePromotions');

const actor = (req) => ({ actorUserId: req.user?.id, requestId: req.id });

const listPromotionsHandler = async (req, res) => {
  const result = await listPromotions(req.params.hotelId, req.query);
  res.status(200).json({
    data: result.promotions,
    meta: { page: result.page, limit: result.limit, total: result.total },
  });
};

const getPromotionHandler = async (req, res) => {
  const data = await getPromotion(req.params.hotelId, req.params.promotionId);
  res.status(200).json({ data });
};

const createPromotionHandler = async (req, res) => {
  const data = await createPromotion(req.params.hotelId, req.body, actor(req));
  res.status(201).json({ data });
};

const updatePromotionHandler = async (req, res) => {
  const data = await updatePromotion(req.params.hotelId, req.params.promotionId, req.body, {
    ...actor(req),
    expectedVersion: req.query.version,
  });
  res.status(200).json({ data });
};

const activatePromotionHandler = async (req, res) => {
  const data = await activatePromotion(req.params.hotelId, req.params.promotionId, actor(req));
  res.status(200).json({ data });
};

const pausePromotionHandler = async (req, res) => {
  const data = await pausePromotion(req.params.hotelId, req.params.promotionId, actor(req));
  res.status(200).json({ data });
};

const archivePromotionHandler = async (req, res) => {
  const data = await archivePromotion(req.params.hotelId, req.params.promotionId, actor(req));
  res.status(200).json({ data });
};

const listRedemptionsHandler = async (req, res) => {
  const result = await listRedemptions(req.params.hotelId, req.params.promotionId, req.query);
  res.status(200).json({
    data: result.redemptions,
    meta: { page: result.page, limit: result.limit, total: result.total },
  });
};

module.exports = {
  listPromotionsHandler,
  getPromotionHandler,
  createPromotionHandler,
  updatePromotionHandler,
  activatePromotionHandler,
  pausePromotionHandler,
  archivePromotionHandler,
  listRedemptionsHandler,
};
