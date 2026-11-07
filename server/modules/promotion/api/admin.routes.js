const express = require('express');

const { authenticate, requirePermission } = require('@middlewares/auth.middleware');
const validate = require('@middlewares/validate.middleware');
const { PERMISSIONS } = require('@constants/permissions');

const schema = require('./promotion.schema');
const controller = require('./admin.controller');

const router = express.Router();

const requireHotelPermission = (permission) =>
  requirePermission(permission, { requireHotelContext: true });

router.use(authenticate);

/**
 * Hotel promotion management (mounted at /api/v1/admin/hotels).
 * Every query is scoped to the hotel in the path and re-checked against the
 * persisted promotion's hotel in the service layer.
 */
router.get(
  '/:hotelId/promotions',
  requireHotelPermission(PERMISSIONS.PROMOTION_READ),
  validate(schema.listPromotions),
  controller.listPromotionsHandler
);

router.post(
  '/:hotelId/promotions',
  requireHotelPermission(PERMISSIONS.PROMOTION_MANAGE),
  validate(schema.createPromotion),
  controller.createPromotionHandler
);

router.get(
  '/:hotelId/promotions/:promotionId',
  requireHotelPermission(PERMISSIONS.PROMOTION_READ),
  validate(schema.promotionParams),
  controller.getPromotionHandler
);

router.patch(
  '/:hotelId/promotions/:promotionId',
  requireHotelPermission(PERMISSIONS.PROMOTION_MANAGE),
  validate(schema.updatePromotion),
  controller.updatePromotionHandler
);

router.post(
  '/:hotelId/promotions/:promotionId/activate',
  requireHotelPermission(PERMISSIONS.PROMOTION_MANAGE),
  validate(schema.promotionParams),
  controller.activatePromotionHandler
);

router.post(
  '/:hotelId/promotions/:promotionId/pause',
  requireHotelPermission(PERMISSIONS.PROMOTION_MANAGE),
  validate(schema.promotionParams),
  controller.pausePromotionHandler
);

router.post(
  '/:hotelId/promotions/:promotionId/archive',
  requireHotelPermission(PERMISSIONS.PROMOTION_MANAGE),
  validate(schema.promotionParams),
  controller.archivePromotionHandler
);

router.get(
  '/:hotelId/promotions/:promotionId/redemptions',
  requireHotelPermission(PERMISSIONS.PROMOTION_READ),
  validate(schema.listRedemptions),
  controller.listRedemptionsHandler
);

module.exports = router;
