const { ROLES } = require('@constants/roles');
const { images: Images, rooms: Rooms, reviews: Reviews } = require('@models/index.js');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Authorization for image write operations.
 *
 * Before this existed, the image routes had no auth at all: anyone could upload
 * or delete images for any hotel/room/review. Writes now require a bearer token
 * (see the routes) and this middleware enforces ownership:
 *   - platform admins may act on anything;
 *   - hotel owners/managers/staff may act on entities belonging to their hotel;
 *   - a user may only manage their own avatar;
 *   - city/country (catalog) imagery is platform-admin only.
 */

function isGlobalAdmin(req) {
  const tokenRoles = new Set(req.auth?.roles || []);
  if (tokenRoles.has(ROLES.ADMIN)) {
    return true;
  }
  return (req.user?.roles || []).some((userRole) => userRole.role?.name === ROLES.ADMIN);
}

function hasHotelRole(req, hotelId) {
  return (req.user?.hotel_roles || []).some(
    (hotelRole) => String(hotelRole.hotel_id) === String(hotelId)
  );
}

async function resolveHotelId(entityType, entityId) {
  if (!UUID_RE.test(String(entityId || ''))) {
    return null;
  }

  if (entityType === 'hotel') {
    return entityId;
  }

  if (entityType === 'room') {
    const room = await Rooms.findOne({ where: { id: entityId }, attributes: ['hotel_id'] });
    return room ? room.hotel_id : null;
  }

  if (entityType === 'review') {
    const review = await Reviews.findOne({ where: { id: entityId }, attributes: ['hotel_id'] });
    return review ? review.hotel_id : null;
  }

  return null;
}

function isSelfEntity(req, entityId) {
  return String(entityId) === String(req.user?.id);
}

async function canWriteEntity(req, entityType, entityId) {
  if (isGlobalAdmin(req)) {
    return true;
  }

  if (entityType === 'user_avatar' || entityType === 'avatar') {
    return isSelfEntity(req, entityId);
  }

  const hotelId = await resolveHotelId(entityType, entityId);
  return Boolean(hotelId) && hasHotelRole(req, hotelId);
}

/**
 * Authorizes writes addressed by `:entityType/:entityId`.
 */
async function authorizeImageEntityWrite(req, res, next) {
  try {
    const { entityType, entityId } = req.params;

    if (await canWriteEntity(req, entityType, entityId)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to manage images for this entity.',
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Authorizes deletes addressed by `:id` by resolving the owning entity first.
 * Unknown images fall through to the controller (404) without leaking existence.
 */
async function authorizeImageDelete(req, res, next) {
  try {
    if (isGlobalAdmin(req)) {
      return next();
    }

    const image = await Images.findOne({
      where: { id: req.params.id },
      attributes: ['id', 'entity_type', 'entity_id'],
    });

    if (!image) {
      return next();
    }

    if (await canWriteEntity(req, image.entity_type, image.entity_id)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to manage images for this entity.',
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  authorizeImageEntityWrite,
  authorizeImageDelete,
};
