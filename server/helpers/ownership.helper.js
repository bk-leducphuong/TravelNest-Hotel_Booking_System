const ApiError = require('@utils/ApiError');

/**
 * Shared ownership guard for hotel-scoped admin routes.
 *
 * Background: admin routes that are scoped by an entity id (e.g. `/rooms/:roomId`,
 * `/bookings/:bookingId`, `/payments/transactions/:transactionId`) historically
 * authorized against the `X-Hotel-Id` header only and never verified that the
 * entity actually belonged to that hotel. That allowed cross-hotel (IDOR) access.
 *
 * Every hotel-scoped read/write should resolve the entity first, then call one of
 * these guards before acting on it.
 *
 * A mismatch throws 404 (not 403) so callers cannot probe for the existence of
 * entities belonging to other tenants.
 */

/**
 * Pure guard: assert that an entity belongs to the given hotel.
 *
 * @param {object|null|undefined} entity - Loaded entity (or null when missing).
 * @param {string|null|undefined} hotelId - Authorized hotel id.
 * @param {{ entityType?: string }} [options]
 * @returns {object} the entity, when the check passes.
 * @throws {ApiError} 404 when the entity is missing or belongs to another hotel.
 */
function assertEntityBelongsToHotel(entity, hotelId, { entityType = 'Resource' } = {}) {
  if (!entity) {
    throw new ApiError(404, 'NOT_FOUND', `${entityType} not found.`);
  }

  const entityHotelId = entity.hotel_id ?? entity.hotelId ?? null;

  if (hotelId && String(entityHotelId) !== String(hotelId)) {
    throw new ApiError(404, 'NOT_FOUND', `${entityType} not found.`);
  }

  return entity;
}

/**
 * Request-aware guard.
 *
 * Platform admins (`req.hotelContext.isPlatformAdmin`) may access any hotel.
 * Everyone else is constrained to `req.hotelContext.hotelId`.
 *
 * @param {object} req - Express request carrying `hotelContext`.
 * @param {object|null|undefined} entity - Loaded entity.
 * @param {{ entityType?: string }} [options]
 * @returns {object} the entity, when the check passes.
 * @throws {ApiError} 404 when the entity is missing or out of scope.
 */
function assertHotelScopedAccess(req, entity, options = {}) {
  if (req?.hotelContext?.isPlatformAdmin) {
    if (!entity) {
      throw new ApiError(404, 'NOT_FOUND', `${options.entityType || 'Resource'} not found.`);
    }
    return entity;
  }

  return assertEntityBelongsToHotel(entity, req?.hotelContext?.hotelId ?? null, options);
}

module.exports = {
  assertEntityBelongsToHotel,
  assertHotelScopedAccess,
};
