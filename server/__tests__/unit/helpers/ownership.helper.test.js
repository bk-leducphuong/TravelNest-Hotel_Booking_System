const {
  assertEntityBelongsToHotel,
  assertHotelScopedAccess,
} = require('@helpers/ownership.helper');
const ApiError = require('@utils/ApiError');

describe('ownership helper', () => {
  describe('assertEntityBelongsToHotel', () => {
    it('returns the entity when it belongs to the hotel', () => {
      const entity = { id: 'e1', hotel_id: 'h1' };
      expect(assertEntityBelongsToHotel(entity, 'h1')).toBe(entity);
    });

    it('accepts a camelCase hotelId on the entity', () => {
      const entity = { id: 'e1', hotelId: 'h1' };
      expect(assertEntityBelongsToHotel(entity, 'h1')).toBe(entity);
    });

    it('compares ids as strings (uuid vs non-uuid)', () => {
      const entity = { id: 'e1', hotel_id: 123 };
      expect(assertEntityBelongsToHotel(entity, '123')).toBe(entity);
    });

    it('throws 404 when the entity belongs to another hotel', () => {
      expect(() => assertEntityBelongsToHotel({ hotel_id: 'h2' }, 'h1')).toThrow(ApiError);

      try {
        assertEntityBelongsToHotel({ hotel_id: 'h2' }, 'h1');
      } catch (error) {
        expect(error.statusCode).toBe(404);
        expect(error.code).toBe('NOT_FOUND');
      }
    });

    it('throws 404 when the entity is missing', () => {
      expect(() => assertEntityBelongsToHotel(null, 'h1')).toThrow(ApiError);
    });

    it('uses the entityType in the error message', () => {
      expect(() => assertEntityBelongsToHotel(null, 'h1', { entityType: 'Room' })).toThrow(
        'Room not found.'
      );
    });
  });

  describe('assertHotelScopedAccess', () => {
    it('lets platform admins read any entity regardless of hotel', () => {
      const entity = { id: 'e1', hotel_id: 'h2' };
      const req = { hotelContext: { isPlatformAdmin: true, hotelId: null } };
      expect(assertHotelScopedAccess(req, entity)).toBe(entity);
    });

    it('scopes non-platform callers to their hotel', () => {
      const req = { hotelContext: { isPlatformAdmin: false, hotelId: 'h1' } };
      expect(() => assertHotelScopedAccess(req, { hotel_id: 'h2' })).toThrow(ApiError);
    });

    it('returns the entity for non-platform callers in scope', () => {
      const entity = { id: 'e1', hotel_id: 'h1' };
      const req = { hotelContext: { isPlatformAdmin: false, hotelId: 'h1' } };
      expect(assertHotelScopedAccess(req, entity)).toBe(entity);
    });

    it('throws 404 for a missing entity even for platform admins', () => {
      const req = { hotelContext: { isPlatformAdmin: true } };
      expect(() => assertHotelScopedAccess(req, null, { entityType: 'Booking' })).toThrow(
        'Booking not found.'
      );
    });
  });
});
