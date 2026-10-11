jest.mock('@modules/superadmin/infrastructure/superadmin.repository', () => ({
  listHotels: jest.fn(),
  findPrimaryOwnersByHotelIds: jest.fn(),
  findHotelById: jest.fn(),
  findHotelMembers: jest.fn(),
  getHotelCounts: jest.fn(),
  getHotelRating: jest.fn(),
}));

const repository = require('@modules/superadmin/infrastructure/superadmin.repository');
const { listHotels, getHotel } = require('@modules/superadmin/application/hotel-admin.service');
const ApiError = require('@utils/ApiError');

function hotelRow(overrides = {}) {
  return {
    id: 'h1',
    toJSON: () => ({
      id: 'h1',
      name: 'Grand Hotel',
      status: 'active',
      hotel_class: 5,
      min_price: '120.00',
      timezone: 'UTC',
      city: { id: 'c1', name: 'Hanoi' },
      country: { id: 'co1', name: 'Vietnam', iso_code: 'VN' },
      created_at: '2024-01-01T00:00:00.000Z',
      ...overrides,
    }),
  };
}

describe('hotel-admin.service', () => {
  describe('listHotels', () => {
    it('serializes hotels and masks the primary owner email by default', async () => {
      repository.listHotels.mockResolvedValue({ rows: [hotelRow()], count: 1 });
      repository.findPrimaryOwnersByHotelIds.mockResolvedValue(
        new Map([['h1', { id: 'u1', email: 'owner@example.com', name: 'Owner One' }]])
      );

      const result = await listHotels({}, {});

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.hotels[0].city).toEqual({ id: 'c1', name: 'Hanoi' });
      expect(result.hotels[0].owner.email).toBe('ow•••@example.com');
    });

    it('unmasks the owner email when unmaskPii is true', async () => {
      repository.listHotels.mockResolvedValue({ rows: [hotelRow()], count: 1 });
      repository.findPrimaryOwnersByHotelIds.mockResolvedValue(
        new Map([['h1', { id: 'u1', email: 'owner@example.com', name: 'Owner One' }]])
      );

      const result = await listHotels({}, { unmaskPii: true });

      expect(result.hotels[0].owner.email).toBe('owner@example.com');
    });

    it('clamps the page size', async () => {
      repository.listHotels.mockResolvedValue({ rows: [], count: 0 });
      repository.findPrimaryOwnersByHotelIds.mockResolvedValue(new Map());

      const result = await listHotels({ page: '2', limit: '500' }, {});

      expect(result.page).toBe(2);
      expect(result.limit).toBe(100);
      expect(repository.listHotels).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100, offset: 100 })
      );
    });
  });

  describe('getHotel', () => {
    it('throws 404 when the hotel is missing', async () => {
      repository.findHotelById.mockResolvedValue(null);

      await expect(getHotel('missing', {})).rejects.toBeInstanceOf(ApiError);
    });

    it('returns members (masked), counts and rating', async () => {
      repository.findHotelById.mockResolvedValue(hotelRow());
      repository.findHotelMembers.mockResolvedValue([
        {
          user_id: 'u1',
          is_primary_owner: true,
          created_at: '2024-01-01T00:00:00.000Z',
          role: { name: 'owner' },
          user: {
            id: 'u1',
            email: 'owner@example.com',
            first_name: 'Owner',
            last_name: 'One',
            status: 'active',
          },
        },
      ]);
      repository.getHotelCounts.mockResolvedValue({ rooms: 10, bookings: 42, reviews: 7 });
      repository.getHotelRating.mockResolvedValue({ overall_rating: '8.75', total_reviews: 7 });

      const result = await getHotel('h1', {});

      expect(result.members).toHaveLength(1);
      expect(result.members[0].role).toBe('owner');
      expect(result.members[0].user.email).toBe('ow•••@example.com');
      expect(result.counts).toEqual({ rooms: 10, bookings: 42, reviews: 7 });
      expect(result.rating).toEqual({ overall: 8.75, total: 7 });
    });
  });
});
