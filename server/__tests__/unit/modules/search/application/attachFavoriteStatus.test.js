jest.mock('@modules/identity', () => ({
  getFavoriteHotelIds: jest.fn(),
}));

const identity = require('@modules/identity');
const { attachFavoriteStatus } = require('@modules/search/application/attachFavoriteStatus');

function responseWith(hotels) {
  return { data: { hotels } };
}

describe('attachFavoriteStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks every hotel false for anonymous users', async () => {
    const response = responseWith([{ hotel_id: 'uuid-1' }, { hotel_id: 'uuid-2' }]);

    await attachFavoriteStatus(response, null);

    expect(response.data.hotels.every((hotel) => hotel.is_favorite === false)).toBe(true);
    expect(identity.getFavoriteHotelIds).not.toHaveBeenCalled();
  });

  it('matches UUID hotel ids as strings (never as numbers)', async () => {
    identity.getFavoriteHotelIds.mockResolvedValue(['01a105dc-0eeb-74b6-8a47-5e200f348df5']);
    const response = responseWith([
      { hotel_id: '01a105dc-0eeb-74b6-8a47-5e200f348df5' },
      { hotel_id: '01a105dc-0eeb-74b6-8a47-5e200f348df6' },
    ]);

    await attachFavoriteStatus(response, 'user-1');

    expect(identity.getFavoriteHotelIds).toHaveBeenCalledWith('user-1', [
      '01a105dc-0eeb-74b6-8a47-5e200f348df5',
      '01a105dc-0eeb-74b6-8a47-5e200f348df6',
    ]);
    expect(response.data.hotels.map((hotel) => hotel.is_favorite)).toEqual([true, false]);
  });

  it('does nothing for an empty result page', async () => {
    const response = responseWith([]);

    await attachFavoriteStatus(response, 'user-1');

    expect(identity.getFavoriteHotelIds).not.toHaveBeenCalled();
  });
});
