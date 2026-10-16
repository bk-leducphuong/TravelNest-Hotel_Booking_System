const { createBooking, getReservationCalendar } = require('@modules/booking/api/schemas');

const UUID = '4c2c9f7e-1f1a-4a5a-9c3b-2f4d5e6a7b8c';
const base = { roomId: UUID, checkInDate: '2026-11-01', checkOutDate: '2026-11-03' };

describe('booking admin schemas', () => {
  describe('createBooking', () => {
    it('accepts exactly one of buyerId / guestEmail', () => {
      expect(createBooking.body.validate({ ...base, buyerId: UUID }).error).toBeUndefined();
      expect(createBooking.body.validate({ ...base, guestEmail: 'g@x.com' }).error).toBeUndefined();
    });

    it('rejects neither', () => {
      expect(createBooking.body.validate({ ...base }).error).toBeDefined();
    });

    it('rejects both', () => {
      expect(
        createBooking.body.validate({ ...base, buyerId: UUID, guestEmail: 'g@x.com' }).error
      ).toBeDefined();
    });

    it('defaults quantity and guests to 1', () => {
      const { value } = createBooking.body.validate({ ...base, buyerId: UUID });
      expect(value).toMatchObject({ quantity: 1, numberOfGuests: 1 });
    });

    it('rejects an invalid date range shape', () => {
      expect(
        createBooking.body.validate({ ...base, buyerId: UUID, checkInDate: 'nope' }).error
      ).toBeDefined();
    });
  });

  describe('getReservationCalendar', () => {
    it('requires both dates', () => {
      expect(getReservationCalendar.query.validate({}).error).toBeDefined();
      expect(
        getReservationCalendar.query.validate({ startDate: '2026-11-01', endDate: '2026-11-30' })
          .error
      ).toBeUndefined();
    });
  });
});
