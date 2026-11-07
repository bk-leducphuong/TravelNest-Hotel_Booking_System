const ApiError = require('@utils/ApiError');
const sequelize = require('@config/database.config');
const { auditService } = require('@platform/audit');

const promotionRepository = require('../../infrastructure/promotion.repository');
const { isModeEnabled } = require('../../domain/flags');
const {
  normalizePromotionInput,
  assertCodeAvailable,
  assertRoomsBelongToHotel,
  presentPromotion,
} = require('./promotionInput');

async function getPromotion(hotelId, promotionId) {
  const promotion = await promotionRepository.findById(promotionId);
  if (!promotion || String(promotion.hotel_id) !== String(hotelId)) {
    throw new ApiError(404, 'PROMOTION_NOT_FOUND', 'Promotion not found');
  }
  return presentPromotion(promotion);
}

async function listPromotions(hotelId, filters = {}) {
  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 20, 1), 100);
  const { rows, count } = await promotionRepository.listByHotel(hotelId, filters, {
    limit,
    offset: (page - 1) * limit,
  });
  return { promotions: rows.map(presentPromotion), page, limit, total: count };
}

async function createPromotion(hotelId, payload, { actorUserId, requestId } = {}) {
  const { values, roomIds } = normalizePromotionInput(payload);
  await assertCodeAvailable(hotelId, values.normalized_code);
  await assertRoomsBelongToHotel(hotelId, roomIds);

  const promotion = await sequelize.transaction(async (transaction) => {
    const created = await promotionRepository.createPromotion(
      {
        ...values,
        hotel_id: hotelId,
        status: 'draft',
        reserved_count: 0,
        redeemed_count: 0,
        version: 1,
        created_by: actorUserId || null,
        updated_by: actorUserId || null,
      },
      { transaction }
    );
    await promotionRepository.setPromotionRooms(created.id, roomIds, { transaction });
    return created;
  });

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'promotion.created',
    entityType: 'promotion',
    entityId: promotion.id,
    hotelId,
    after: values,
    requestId,
  });

  return getPromotion(hotelId, promotion.id);
}

async function updatePromotion(
  hotelId,
  promotionId,
  payload,
  { actorUserId, requestId, expectedVersion } = {}
) {
  const existing = await promotionRepository.findById(promotionId);
  if (!existing || String(existing.hotel_id) !== String(hotelId)) {
    throw new ApiError(404, 'PROMOTION_NOT_FOUND', 'Promotion not found');
  }
  if (existing.status !== 'draft') {
    throw new ApiError(
      409,
      'PROMOTION_NOT_EDITABLE',
      'Only draft promotions can be edited; pause or archive and create a new promotion'
    );
  }

  const version = expectedVersion === undefined ? existing.version : Number(expectedVersion);
  if (Number(version) !== Number(existing.version)) {
    throw new ApiError(
      409,
      'PROMOTION_VERSION_CONFLICT',
      'This promotion was changed by someone else. Reload it and try again'
    );
  }

  const { values, roomIds } = normalizePromotionInput(payload, existing);
  await assertCodeAvailable(hotelId, values.normalized_code, { excludeId: promotionId });
  await assertRoomsBelongToHotel(hotelId, roomIds);

  await sequelize.transaction(async (transaction) => {
    const count = await promotionRepository.updateDraftWithVersion(
      promotionId,
      version,
      { ...values, updated_by: actorUserId || null },
      { transaction }
    );
    if (count !== 1) {
      throw new ApiError(
        409,
        'PROMOTION_VERSION_CONFLICT',
        'This promotion was changed by someone else. Reload it and try again'
      );
    }
    await promotionRepository.setPromotionRooms(promotionId, roomIds, { transaction });
  });

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: 'promotion.updated',
    entityType: 'promotion',
    entityId: promotionId,
    hotelId,
    before: existing,
    after: values,
    requestId,
  });

  return getPromotion(hotelId, promotionId);
}

async function changeStatus(
  hotelId,
  promotionId,
  nextStatus,
  allowedFrom,
  { actorUserId, requestId } = {}
) {
  const existing = await promotionRepository.findById(promotionId);
  if (!existing || String(existing.hotel_id) !== String(hotelId)) {
    throw new ApiError(404, 'PROMOTION_NOT_FOUND', 'Promotion not found');
  }
  if (!allowedFrom.includes(existing.status)) {
    throw new ApiError(
      409,
      'PROMOTION_INVALID_TRANSITION',
      `Cannot move a ${existing.status} promotion to ${nextStatus}`
    );
  }

  if (nextStatus === 'active') {
    if (!isModeEnabled(existing.mode)) {
      throw new ApiError(
        409,
        'PROMOTION_MODE_DISABLED',
        'This promotion mode is currently disabled by the platform'
      );
    }
    if (existing.discount_type === 'percentage' && !(existing.discount_basis_points > 0)) {
      throw new ApiError(400, 'PROMOTION_INCOMPLETE', 'Percentage discount is missing');
    }
    if (existing.discount_type === 'fixed' && !(Number(existing.discount_value) > 0)) {
      throw new ApiError(400, 'PROMOTION_INCOMPLETE', 'Fixed discount is missing');
    }
    if (existing.mode === 'code' && !existing.normalized_code) {
      throw new ApiError(400, 'PROMOTION_INCOMPLETE', 'Promo code is missing');
    }
    if (
      existing.mode === 'automatic' &&
      existing.room_scope === 'selected' &&
      (existing.promotionRooms || []).length === 0
    ) {
      throw new ApiError(400, 'PROMOTION_INCOMPLETE', 'Selected-room promotion has no rooms');
    }
  }

  await promotionRepository.updatePromotion(promotionId, {
    status: nextStatus,
    updated_by: actorUserId || null,
  });

  await auditService.record({
    actorUserId,
    actorType: actorUserId ? 'user' : 'system',
    action: `promotion.${nextStatus}`,
    entityType: 'promotion',
    entityId: promotionId,
    hotelId,
    before: { status: existing.status },
    after: { status: nextStatus },
    requestId,
  });

  return getPromotion(hotelId, promotionId);
}

async function activatePromotion(hotelId, promotionId, actor = {}) {
  return changeStatus(hotelId, promotionId, 'active', ['draft', 'paused'], actor);
}

async function pausePromotion(hotelId, promotionId, actor = {}) {
  return changeStatus(hotelId, promotionId, 'paused', ['active'], actor);
}

async function archivePromotion(hotelId, promotionId, actor = {}) {
  return changeStatus(hotelId, promotionId, 'archived', ['draft', 'active', 'paused'], actor);
}

async function listRedemptions(hotelId, promotionId, filters = {}) {
  const promotion = await promotionRepository.findById(promotionId);
  if (!promotion || String(promotion.hotel_id) !== String(hotelId)) {
    throw new ApiError(404, 'PROMOTION_NOT_FOUND', 'Promotion not found');
  }

  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 20, 1), 100);
  const { rows, count } = await promotionRepository.listRedemptionsByPromotion(promotionId, {
    limit,
    offset: (page - 1) * limit,
  });

  return { redemptions: rows, page, limit, total: count };
}

module.exports = {
  getPromotion,
  listPromotions,
  createPromotion,
  updatePromotion,
  activatePromotion,
  pausePromotion,
  archivePromotion,
  listRedemptions,
};
