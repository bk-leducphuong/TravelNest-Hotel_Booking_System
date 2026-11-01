const {
  toMinorUnits,
  fromMinorUnits,
  normalizeOffer,
  selectOffer,
  sumAvailableRooms,
} = require('@modules/search/domain/offers');

function row(overrides = {}) {
  return {
    room_id: 'r1',
    room_name: 'Deluxe',
    room_type: 'deluxe',
    max_guests: 2,
    room_size: 30,
    min_available_rooms: 2,
    total_price: '250.50',
    avg_price_per_night: '125.25',
    currency: 'USD',
    has_free_cancellation: 0,
    ...overrides,
  };
}

describe('search/domain/offers', () => {
  it('does money arithmetic in minor units', () => {
    expect(toMinorUnits('0.1')).toBe(10);
    expect(toMinorUnits(250.5)).toBe(25050);
    expect(toMinorUnits('nonsense')).toBeNull();
    expect(fromMinorUnits(25050)).toBe(250.5);
  });

  describe('normalizeOffer', () => {
    it('keeps the per-room subtotal and adds the all-rooms subtotal', () => {
      const offer = normalizeOffer(row(), { nights: 2, rooms: 3 });

      expect(offer).toMatchObject({
        room_id: 'r1',
        nights: 2,
        rooms: 3,
        available_rooms: 2,
        currency: 'USD',
        total_price: 250.5,
        total_price_for_requested_rooms: 751.5,
        price_per_night: 125.25,
        has_free_cancellation: false,
      });
    });

    it('rounds half-cent floats deterministically', () => {
      const offer = normalizeOffer(row({ total_price: '0.125', avg_price_per_night: '0.375' }), {
        nights: 1,
        rooms: 1,
      });

      expect(offer.total_price).toBe(0.13);
      expect(offer.price_per_night).toBe(0.38);
    });
  });

  describe('selectOffer', () => {
    const cheapNoCancel = {
      room_id: 'a',
      total_price: 100,
      price_per_night: 50,
      has_free_cancellation: false,
    };
    const cheapCancel = {
      room_id: 'b',
      total_price: 120,
      price_per_night: 60,
      has_free_cancellation: true,
    };
    const expensive = {
      room_id: 'c',
      total_price: 200,
      price_per_night: 100,
      has_free_cancellation: true,
    };

    it('returns null for an empty list', () => {
      expect(selectOffer([])).toBeNull();
    });

    it('picks the cheapest eligible offer', () => {
      expect(selectOffer([expensive, cheapNoCancel, cheapCancel]).room_id).toBe('a');
    });

    it('applies the budget before selection', () => {
      expect(selectOffer([cheapNoCancel, cheapCancel], { minPrice: 55 }).room_id).toBe('b');
      expect(selectOffer([cheapCancel, expensive], { maxPrice: 150 }).room_id).toBe('b');
      expect(selectOffer([expensive], { maxPrice: 50 })).toBeNull();
    });

    it('restricts to free-cancellation offers when asked', () => {
      expect(
        selectOffer([cheapNoCancel, cheapCancel], { freeCancellationOnly: true }).room_id
      ).toBe('b');
      expect(selectOffer([cheapNoCancel], { freeCancellationOnly: true })).toBeNull();
    });

    it('is deterministic for equal prices', () => {
      const first = { room_id: 'a', total_price: 100, price_per_night: 50 };
      const second = { room_id: 'b', total_price: 100, price_per_night: 50 };

      expect(selectOffer([second, first]).room_id).toBe('a');
    });

    it('excludes offers with an unusable price', () => {
      expect(selectOffer([{ room_id: 'x', total_price: 10, price_per_night: null }])).toBeNull();
    });
  });

  it('sums per-night availability across room types (never across dates)', () => {
    expect(sumAvailableRooms([{ available_rooms: 2 }, { available_rooms: 3 }])).toBe(5);
    expect(sumAvailableRooms([])).toBe(0);
  });
});
