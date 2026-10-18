const {
  createRoom,
  updateRoom,
  updateHotel,
  listCities,
  listCountries,
  listAmenities,
  setHotelAmenities,
  createCancellationRule,
  updateCancellationRule,
} = require('@modules/catalog/api/admin.schema');

describe('catalog admin schema', () => {
  describe('room status', () => {
    it('accepts the `maintenance` room status (ROOM_STATUSES source of truth)', () => {
      const { error, value } = createRoom.body.validate({
        roomName: 'Suite',
        status: 'maintenance',
      });

      expect(error).toBeUndefined();
      expect(value.status).toBe('maintenance');
    });

    it('rejects an unknown room status', () => {
      const { error } = updateRoom.body.validate({ status: 'bogus' });

      expect(error).toBeDefined();
    });
  });

  describe('hotel status', () => {
    it('accepts the real lifecycle statuses', () => {
      ['active', 'inactive', 'suspended'].forEach((status) => {
        expect(updateHotel.body.validate({ status }).error).toBeUndefined();
      });
    });

    it('rejects the stale `pending` value the DB enum does not support', () => {
      expect(updateHotel.body.validate({ status: 'pending' }).error).toBeDefined();
    });
  });

  describe('location lookups', () => {
    it('applies defaults and accepts an empty query', () => {
      const city = listCities.query.validate({});
      expect(city.error).toBeUndefined();
      expect(city.value).toMatchObject({ page: 1, limit: 100 });

      const country = listCountries.query.validate({});
      expect(country.error).toBeUndefined();
      expect(country.value).toMatchObject({ page: 1, limit: 200 });
    });

    it('rejects a non-uuid countryId', () => {
      expect(listCities.query.validate({ countryId: 'not-a-uuid' }).error).toBeDefined();
    });
  });

  describe('room bed type', () => {
    it('accepts a known bed type', () => {
      const { error } = updateRoom.body.validate({ bedType: 'king' });
      expect(error).toBeUndefined();
    });

    it('rejects an unknown bed type', () => {
      expect(updateRoom.body.validate({ bedType: 'waterbed' }).error).toBeDefined();
    });
  });

  describe('amenities', () => {
    it('accepts an amenity id array (including empty to clear)', () => {
      const id = '4c2c9f7e-1f1a-4a5a-9c3b-2f4d5e6a7b8c';
      expect(setHotelAmenities.body.validate({ amenityIds: [id] }).error).toBeUndefined();
      expect(setHotelAmenities.body.validate({ amenityIds: [] }).error).toBeUndefined();
    });

    it('rejects duplicate or non-uuid amenity ids', () => {
      const id = '4c2c9f7e-1f1a-4a5a-9c3b-2f4d5e6a7b8c';
      expect(setHotelAmenities.body.validate({ amenityIds: [id, id] }).error).toBeDefined();
      expect(setHotelAmenities.body.validate({ amenityIds: ['nope'] }).error).toBeDefined();
      expect(setHotelAmenities.body.validate({}).error).toBeDefined();
    });

    it('validates the amenity catalog query', () => {
      expect(listAmenities.query.validate({ applicableTo: 'room' }).error).toBeUndefined();
      expect(listAmenities.query.validate({ applicableTo: 'desk' }).error).toBeDefined();
    });
  });

  describe('cancellation rules', () => {
    it('defaults the create body to an empty (hotel-wide) rule', () => {
      const { error, value } = createCancellationRule.body.validate(undefined);
      expect(error).toBeUndefined();
      expect(value).toEqual({});
    });

    it('accepts partial updates and rejects an empty one', () => {
      expect(updateCancellationRule.body.validate({ isActive: false }).error).toBeUndefined();
      expect(updateCancellationRule.body.validate({}).error).toBeDefined();
    });

    it('rejects an invalid fee type', () => {
      expect(
        createCancellationRule.body.validate({ cancellationFeeType: 'flat' }).error
      ).toBeDefined();
    });
  });
});
