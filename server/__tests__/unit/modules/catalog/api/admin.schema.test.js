const {
  createRoom,
  updateRoom,
  updateHotel,
  listCities,
  listCountries,
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
});
